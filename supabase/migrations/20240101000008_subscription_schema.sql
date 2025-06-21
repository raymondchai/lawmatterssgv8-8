-- Update subscription tier enum to match new pricing structure
ALTER TYPE subscription_tier RENAME TO subscription_tier_old;
CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'pro', 'enterprise');

-- Update profiles table with subscription-related columns
ALTER TABLE profiles 
  ALTER COLUMN subscription_tier DROP DEFAULT,
  ALTER COLUMN subscription_tier TYPE subscription_tier USING subscription_tier::text::subscription_tier,
  ALTER COLUMN subscription_tier SET DEFAULT 'free';

-- Add new subscription-related columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT GENERATED ALWAYS AS (
  CASE 
    WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN first_name || ' ' || last_name
    WHEN first_name IS NOT NULL THEN first_name
    WHEN last_name IS NOT NULL THEN last_name
    ELSE NULL
  END
) STORED;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator', 'super_admin'));

-- Drop old enum type
DROP TYPE subscription_tier_old;

-- Create subscription_history table for tracking subscription changes
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id TEXT,
  old_tier subscription_tier,
  new_tier subscription_tier NOT NULL,
  old_status TEXT,
  new_status TEXT,
  change_reason TEXT,
  effective_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment_history table for tracking payments
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending', 'canceled')),
  payment_method_type TEXT,
  description TEXT,
  invoice_url TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create usage_tracking table for detailed usage tracking
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('ai_query', 'document_upload', 'document_download', 'custom_document')),
  resource_id UUID, -- Reference to specific resource if applicable
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  usage_count INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create billing_alerts table for usage alerts
CREATE TABLE IF NOT EXISTS billing_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('usage_limit_reached', 'usage_limit_warning', 'payment_failed', 'subscription_cancelled')),
  resource_type TEXT,
  threshold_percentage INTEGER,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON profiles(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_effective_date ON subscription_history(effective_date);

CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_stripe_subscription_id ON payment_history(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_resource_type ON usage_tracking(resource_type);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_usage_date ON usage_tracking(usage_date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date_resource ON usage_tracking(user_id, usage_date, resource_type);

CREATE INDEX IF NOT EXISTS idx_billing_alerts_user_id ON billing_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_alerts_is_read ON billing_alerts(is_read);

-- Create triggers for updated_at
CREATE TRIGGER update_subscription_history_updated_at 
  BEFORE UPDATE ON subscription_history 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to track subscription changes
CREATE OR REPLACE FUNCTION track_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if subscription tier or status actually changed
  IF (OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier) OR 
     (OLD.subscription_status IS DISTINCT FROM NEW.subscription_status) THEN
    
    INSERT INTO subscription_history (
      user_id,
      stripe_subscription_id,
      old_tier,
      new_tier,
      old_status,
      new_status,
      change_reason,
      effective_date
    ) VALUES (
      NEW.id,
      NEW.stripe_subscription_id,
      OLD.subscription_tier,
      NEW.subscription_tier,
      OLD.subscription_status,
      NEW.subscription_status,
      'automatic_update',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription change tracking
CREATE TRIGGER track_subscription_changes
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION track_subscription_change();

-- Create function to get current month usage
CREATE OR REPLACE FUNCTION get_monthly_usage(
  p_user_id UUID,
  p_resource_type TEXT,
  p_month DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  usage_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(usage_count), 0)
  INTO usage_count
  FROM usage_tracking
  WHERE user_id = p_user_id
    AND resource_type = p_resource_type
    AND usage_date >= DATE_TRUNC('month', p_month)
    AND usage_date < DATE_TRUNC('month', p_month) + INTERVAL '1 month';
  
  RETURN usage_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO usage_tracking (
    user_id,
    resource_type,
    resource_id,
    usage_date,
    usage_count,
    metadata
  ) VALUES (
    p_user_id,
    p_resource_type,
    p_resource_id,
    CURRENT_DATE,
    1,
    p_metadata
  )
  ON CONFLICT (user_id, resource_type, usage_date, COALESCE(resource_id, '00000000-0000-0000-0000-000000000000'::UUID))
  DO UPDATE SET
    usage_count = usage_tracking.usage_count + 1,
    metadata = p_metadata;
END;
$$ LANGUAGE plpgsql;

-- Add unique constraint for usage tracking to prevent duplicates
-- Note: We'll use a partial unique index instead since COALESCE can't be used in UNIQUE constraints
CREATE UNIQUE INDEX unique_daily_usage_with_resource
ON usage_tracking (user_id, resource_type, usage_date, resource_id)
WHERE resource_id IS NOT NULL;

CREATE UNIQUE INDEX unique_daily_usage_without_resource
ON usage_tracking (user_id, resource_type, usage_date)
WHERE resource_id IS NULL;
