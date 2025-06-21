-- Create two_factor_auth table for storing 2FA settings
CREATE TABLE two_factor_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT false,
  method TEXT NOT NULL CHECK (method IN ('totp', 'sms')) DEFAULT 'totp',
  secret TEXT, -- TOTP secret key (encrypted)
  phone_number TEXT, -- For SMS 2FA
  backup_codes TEXT[], -- Array of backup codes (hashed)
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create two_factor_attempts table for tracking verification attempts
CREATE TABLE two_factor_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('totp', 'sms', 'backup')),
  code_hash TEXT NOT NULL, -- Hashed version of the attempted code
  success BOOLEAN DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create two_factor_recovery_codes table for backup codes
CREATE TABLE two_factor_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  code_hash TEXT NOT NULL, -- Hashed recovery code
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add 2FA fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS two_factor_method TEXT CHECK (two_factor_method IN ('totp', 'sms'));

-- Create indexes for better performance
CREATE INDEX idx_two_factor_auth_user_id ON two_factor_auth(user_id);
CREATE INDEX idx_two_factor_attempts_user_id ON two_factor_attempts(user_id);
CREATE INDEX idx_two_factor_attempts_created_at ON two_factor_attempts(created_at);
CREATE INDEX idx_two_factor_recovery_codes_user_id ON two_factor_recovery_codes(user_id);
CREATE INDEX idx_two_factor_recovery_codes_used ON two_factor_recovery_codes(user_id, used);

-- Enable RLS on 2FA tables
ALTER TABLE two_factor_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_recovery_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for two_factor_auth
-- Users can only manage their own 2FA settings
CREATE POLICY "Users can manage their own 2FA settings" ON two_factor_auth
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for two_factor_attempts
-- Users can view their own 2FA attempts
CREATE POLICY "Users can view their own 2FA attempts" ON two_factor_attempts
  FOR SELECT USING (auth.uid() = user_id);

-- System can insert 2FA attempts
CREATE POLICY "System can create 2FA attempts" ON two_factor_attempts
  FOR INSERT WITH CHECK (true);

-- RLS Policies for two_factor_recovery_codes
-- Users can view their own recovery codes
CREATE POLICY "Users can view their own recovery codes" ON two_factor_recovery_codes
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own recovery codes (mark as used)
CREATE POLICY "Users can update their own recovery codes" ON two_factor_recovery_codes
  FOR UPDATE USING (auth.uid() = user_id);

-- System can insert recovery codes
CREATE POLICY "System can create recovery codes" ON two_factor_recovery_codes
  FOR INSERT WITH CHECK (true);

-- Create function to update 2FA updated_at timestamp
CREATE OR REPLACE FUNCTION update_two_factor_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for 2FA updates
CREATE TRIGGER update_two_factor_auth_updated_at
  BEFORE UPDATE ON two_factor_auth
  FOR EACH ROW EXECUTE FUNCTION update_two_factor_updated_at();

-- Create function to generate backup codes
CREATE OR REPLACE FUNCTION generate_backup_codes(target_user_id UUID, num_codes INTEGER DEFAULT 10)
RETURNS TEXT[] AS $$
DECLARE
  codes TEXT[];
  code TEXT;
  i INTEGER;
BEGIN
  -- Delete existing unused backup codes
  DELETE FROM two_factor_recovery_codes 
  WHERE user_id = target_user_id AND used = false;
  
  codes := ARRAY[]::TEXT[];
  
  FOR i IN 1..num_codes LOOP
    -- Generate a random 8-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 8));
    codes := array_append(codes, code);
    
    -- Insert hashed version into database
    INSERT INTO two_factor_recovery_codes (user_id, code_hash)
    VALUES (target_user_id, crypt(code, gen_salt('bf')));
  END LOOP;
  
  RETURN codes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to verify 2FA code
CREATE OR REPLACE FUNCTION verify_two_factor_code(
  target_user_id UUID,
  code TEXT,
  method_type TEXT DEFAULT 'totp'
)
RETURNS BOOLEAN AS $$
DECLARE
  auth_record RECORD;
  is_valid BOOLEAN := false;
  attempt_id UUID;
BEGIN
  -- Get 2FA settings for user
  SELECT * INTO auth_record 
  FROM two_factor_auth 
  WHERE user_id = target_user_id AND enabled = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Log the attempt
  INSERT INTO two_factor_attempts (user_id, method, code_hash, ip_address, user_agent)
  VALUES (
    target_user_id, 
    method_type, 
    crypt(code, gen_salt('bf')),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  ) RETURNING id INTO attempt_id;
  
  -- Verify based on method
  IF method_type = 'backup' THEN
    -- Check if it's a valid unused backup code
    SELECT EXISTS(
      SELECT 1 FROM two_factor_recovery_codes 
      WHERE user_id = target_user_id 
      AND code_hash = crypt(code, code_hash)
      AND used = false
    ) INTO is_valid;
    
    -- Mark backup code as used if valid
    IF is_valid THEN
      UPDATE two_factor_recovery_codes 
      SET used = true, used_at = NOW()
      WHERE user_id = target_user_id 
      AND code_hash = crypt(code, code_hash)
      AND used = false;
    END IF;
    
  ELSIF method_type = 'totp' THEN
    -- TOTP verification would be handled by the application layer
    -- This is a placeholder that always returns false for security
    -- The actual TOTP verification should be done in the application
    is_valid := false;
    
  ELSIF method_type = 'sms' THEN
    -- SMS verification would be handled by the application layer
    -- This is a placeholder that always returns false for security
    is_valid := false;
  END IF;
  
  -- Update attempt record with result
  UPDATE two_factor_attempts 
  SET success = is_valid 
  WHERE id = attempt_id;
  
  -- Update last used timestamp if successful
  IF is_valid THEN
    UPDATE two_factor_auth 
    SET last_used_at = NOW() 
    WHERE user_id = target_user_id;
  END IF;
  
  RETURN is_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to enable 2FA
CREATE OR REPLACE FUNCTION enable_two_factor_auth(
  target_user_id UUID,
  auth_method TEXT,
  secret_key TEXT DEFAULT NULL,
  phone TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert or update 2FA settings
  INSERT INTO two_factor_auth (user_id, enabled, method, secret, phone_number)
  VALUES (target_user_id, true, auth_method, secret_key, phone)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    enabled = true,
    method = auth_method,
    secret = COALESCE(secret_key, two_factor_auth.secret),
    phone_number = COALESCE(phone, two_factor_auth.phone_number),
    updated_at = NOW();
  
  -- Update profile
  UPDATE profiles 
  SET two_factor_enabled = true, two_factor_method = auth_method
  WHERE id = target_user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to disable 2FA
CREATE OR REPLACE FUNCTION disable_two_factor_auth(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update 2FA settings
  UPDATE two_factor_auth 
  SET enabled = false, updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- Update profile
  UPDATE profiles 
  SET two_factor_enabled = false, two_factor_method = NULL
  WHERE id = target_user_id;
  
  -- Delete unused backup codes
  DELETE FROM two_factor_recovery_codes 
  WHERE user_id = target_user_id AND used = false;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old 2FA attempts (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_two_factor_attempts()
RETURNS void AS $$
BEGIN
  -- Delete attempts older than 30 days
  DELETE FROM two_factor_attempts 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION generate_backup_codes TO authenticated;
GRANT EXECUTE ON FUNCTION verify_two_factor_code TO authenticated;
GRANT EXECUTE ON FUNCTION enable_two_factor_auth TO authenticated;
GRANT EXECUTE ON FUNCTION disable_two_factor_auth TO authenticated;
