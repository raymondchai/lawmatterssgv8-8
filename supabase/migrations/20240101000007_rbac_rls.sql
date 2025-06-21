-- Enable RLS on RBAC tables
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Permissions table policies
-- Anyone can read permissions (needed for UI)
CREATE POLICY "Anyone can read permissions" ON permissions
  FOR SELECT USING (true);

-- Only super admins can modify permissions
CREATE POLICY "Only super admins can modify permissions" ON permissions
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Role permissions table policies
-- Anyone can read role permissions (needed for permission checks)
CREATE POLICY "Anyone can read role permissions" ON role_permissions
  FOR SELECT USING (true);

-- Only super admins can modify role permissions
CREATE POLICY "Only super admins can modify role permissions" ON role_permissions
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- User permissions table policies
-- Users can read their own permissions
CREATE POLICY "Users can read their own permissions" ON user_permissions
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

-- Admins can read all user permissions
CREATE POLICY "Admins can read all user permissions" ON user_permissions
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Admins can manage user permissions
CREATE POLICY "Admins can manage user permissions" ON user_permissions
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Audit logs table policies
-- Only admins can read audit logs
CREATE POLICY "Only admins can read audit logs" ON audit_logs
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT TO authenticated 
  WITH CHECK (true);

-- Update existing profiles RLS policies to include role checks
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Recreate with role-based access
CREATE POLICY "Users can read their own profile" ON profiles
  FOR SELECT TO authenticated 
  USING (id = auth.uid());

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT TO authenticated 
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator', 'super_admin')
    )
  );

-- Users can update their own profile (role changes will be handled by triggers)
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update any profile including roles
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Only super admins can delete profiles
CREATE POLICY "Only super admins can delete profiles" ON profiles
  FOR DELETE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Update document policies to use permission system
DROP POLICY IF EXISTS "Users can read their own documents" ON uploaded_documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON uploaded_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON uploaded_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON uploaded_documents;

-- New permission-based policies for documents
CREATE POLICY "Users can read their own documents" ON uploaded_documents
  FOR SELECT TO authenticated 
  USING (
    user_id = auth.uid() OR
    user_has_permission(auth.uid(), 'documents.read_all')
  );

CREATE POLICY "Users can create documents with permission" ON uploaded_documents
  FOR INSERT TO authenticated 
  WITH CHECK (
    user_id = auth.uid() AND
    user_has_permission(auth.uid(), 'documents.create')
  );

CREATE POLICY "Users can update their own documents with permission" ON uploaded_documents
  FOR UPDATE TO authenticated 
  USING (
    user_id = auth.uid() AND
    user_has_permission(auth.uid(), 'documents.update')
  );

CREATE POLICY "Users can delete their own documents with permission" ON uploaded_documents
  FOR DELETE TO authenticated 
  USING (
    user_id = auth.uid() AND
    user_has_permission(auth.uid(), 'documents.delete')
  );

-- Update template policies
DROP POLICY IF EXISTS "Anyone can read public templates" ON templates;
DROP POLICY IF EXISTS "Users can read their own templates" ON templates;
DROP POLICY IF EXISTS "Users can insert templates" ON templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON templates;

-- New permission-based policies for templates
CREATE POLICY "Anyone can read public templates" ON templates
  FOR SELECT USING (
    is_public = true OR
    created_by = auth.uid() OR
    user_has_permission(auth.uid(), 'templates.read')
  );

CREATE POLICY "Users can create templates with permission" ON templates
  FOR INSERT TO authenticated 
  WITH CHECK (
    created_by = auth.uid() AND
    user_has_permission(auth.uid(), 'templates.create')
  );

CREATE POLICY "Users can update their own templates" ON templates
  FOR UPDATE TO authenticated 
  USING (
    (created_by = auth.uid() AND user_has_permission(auth.uid(), 'templates.update')) OR
    user_has_permission(auth.uid(), 'templates.moderate')
  );

CREATE POLICY "Users can delete their own templates" ON templates
  FOR DELETE TO authenticated 
  USING (
    (created_by = auth.uid() AND user_has_permission(auth.uid(), 'templates.delete')) OR
    user_has_permission(auth.uid(), 'templates.moderate')
  );

-- Create function to initialize user permissions on signup
CREATE OR REPLACE FUNCTION initialize_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  
  -- Initialize user usage tracking
  INSERT INTO user_usage (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_profile();
