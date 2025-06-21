-- Create role enum type
CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator', 'super_admin');

-- Add role column to profiles table
ALTER TABLE profiles ADD COLUMN role user_role DEFAULT 'user';

-- Create permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  resource TEXT NOT NULL, -- e.g., 'documents', 'templates', 'law_firms', 'users'
  action TEXT NOT NULL, -- e.g., 'create', 'read', 'update', 'delete', 'moderate'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create role_permissions table (many-to-many)
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- Create user_permissions table for individual user permissions
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE NOT NULL,
  granted BOOLEAN DEFAULT true, -- true = granted, false = revoked
  granted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

-- Create audit_logs table for tracking admin actions
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);

-- Insert default permissions
INSERT INTO permissions (name, description, resource, action) VALUES
-- Document permissions
('documents.create', 'Create documents', 'documents', 'create'),
('documents.read', 'Read documents', 'documents', 'read'),
('documents.update', 'Update documents', 'documents', 'update'),
('documents.delete', 'Delete documents', 'documents', 'delete'),
('documents.read_all', 'Read all user documents', 'documents', 'read_all'),

-- Template permissions
('templates.create', 'Create templates', 'templates', 'create'),
('templates.read', 'Read templates', 'templates', 'read'),
('templates.update', 'Update templates', 'templates', 'update'),
('templates.delete', 'Delete templates', 'templates', 'delete'),
('templates.moderate', 'Moderate public templates', 'templates', 'moderate'),

-- Law firm permissions
('law_firms.create', 'Create law firms', 'law_firms', 'create'),
('law_firms.read', 'Read law firms', 'law_firms', 'read'),
('law_firms.update', 'Update law firms', 'law_firms', 'update'),
('law_firms.delete', 'Delete law firms', 'law_firms', 'delete'),
('law_firms.verify', 'Verify law firms', 'law_firms', 'verify'),
('law_firms.moderate_reviews', 'Moderate law firm reviews', 'law_firms', 'moderate_reviews'),

-- User management permissions
('users.create', 'Create users', 'users', 'create'),
('users.read', 'Read user profiles', 'users', 'read'),
('users.update', 'Update user profiles', 'users', 'update'),
('users.delete', 'Delete users', 'users', 'delete'),
('users.manage_roles', 'Manage user roles', 'users', 'manage_roles'),
('users.manage_permissions', 'Manage user permissions', 'users', 'manage_permissions'),

-- System permissions
('system.analytics', 'View system analytics', 'system', 'analytics'),
('system.monitoring', 'View system monitoring', 'system', 'monitoring'),
('system.audit_logs', 'View audit logs', 'system', 'audit_logs'),
('system.settings', 'Manage system settings', 'system', 'settings');

-- Assign permissions to roles
-- User role (default)
INSERT INTO role_permissions (role, permission_id)
SELECT 'user', id FROM permissions WHERE name IN (
  'documents.create', 'documents.read', 'documents.update', 'documents.delete',
  'templates.read', 'templates.create',
  'law_firms.read'
);

-- Moderator role
INSERT INTO role_permissions (role, permission_id)
SELECT 'moderator', id FROM permissions WHERE name IN (
  'documents.create', 'documents.read', 'documents.update', 'documents.delete',
  'templates.read', 'templates.create', 'templates.update', 'templates.moderate',
  'law_firms.read', 'law_firms.update', 'law_firms.moderate_reviews',
  'users.read'
);

-- Admin role
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions WHERE name IN (
  'documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.read_all',
  'templates.create', 'templates.read', 'templates.update', 'templates.delete', 'templates.moderate',
  'law_firms.create', 'law_firms.read', 'law_firms.update', 'law_firms.delete', 'law_firms.verify', 'law_firms.moderate_reviews',
  'users.create', 'users.read', 'users.update', 'users.delete', 'users.manage_roles',
  'system.analytics', 'system.monitoring', 'system.audit_logs'
);

-- Super Admin role (all permissions)
INSERT INTO role_permissions (role, permission_id)
SELECT 'super_admin', id FROM permissions;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(user_uuid UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role user_role;
  has_permission BOOLEAN := FALSE;
BEGIN
  -- Get user role
  SELECT role INTO user_role FROM profiles WHERE id = user_uuid;
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check role-based permissions
  SELECT EXISTS(
    SELECT 1 FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role = user_role AND p.name = permission_name
  ) INTO has_permission;
  
  -- If role doesn't have permission, check individual user permissions
  IF NOT has_permission THEN
    SELECT COALESCE(up.granted, FALSE) INTO has_permission
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = user_uuid AND p.name = permission_name;
  END IF;
  
  RETURN COALESCE(has_permission, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  user_uuid UUID,
  action_name TEXT,
  resource_type_name TEXT,
  resource_id_value TEXT DEFAULT NULL,
  old_values_json JSONB DEFAULT NULL,
  new_values_json JSONB DEFAULT NULL,
  ip_addr INET DEFAULT NULL,
  user_agent_string TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id, 
    old_values, new_values, ip_address, user_agent
  ) VALUES (
    user_uuid, action_name, resource_type_name, resource_id_value,
    old_values_json, new_values_json, ip_addr, user_agent_string
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS TABLE(permission_name TEXT, granted_by_role BOOLEAN, granted_individually BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  WITH role_perms AS (
    SELECT p.name, TRUE as from_role
    FROM profiles prof
    JOIN role_permissions rp ON rp.role = prof.role
    JOIN permissions p ON rp.permission_id = p.id
    WHERE prof.id = user_uuid
  ),
  user_perms AS (
    SELECT p.name, up.granted as individually
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = user_uuid
  )
  SELECT 
    COALESCE(rp.name, up.name) as permission_name,
    COALESCE(rp.from_role, FALSE) as granted_by_role,
    COALESCE(up.individually, FALSE) as granted_individually
  FROM role_perms rp
  FULL OUTER JOIN user_perms up ON rp.name = up.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
