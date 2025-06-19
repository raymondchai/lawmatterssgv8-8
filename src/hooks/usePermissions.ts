import { useState, useEffect } from 'react';
import { rbacApi } from '@/lib/api/rbac';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';

interface UsePermissionsReturn {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

export const usePermissions = (): UsePermissionsReturn => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

  const fetchPermissions = async () => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userPermissions = await rbacApi.getUserPermissionsList();
      setPermissions(userPermissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [user]);

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    return permissionList.some(permission => permissions.includes(permission));
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    return permissionList.every(permission => permissions.includes(permission));
  };

  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!profile?.role) return false;
    
    if (Array.isArray(role)) {
      return role.includes(profile.role);
    }
    
    return profile.role === role;
  };

  const isAdmin = hasRole(['admin', 'super_admin']);
  const isModerator = hasRole(['moderator', 'admin', 'super_admin']);
  const isSuperAdmin = hasRole('super_admin');

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isAdmin,
    isModerator,
    isSuperAdmin,
    loading,
    refetch: fetchPermissions
  };
};

// Higher-order component for permission-based rendering
export const withPermission = (
  permission: string | string[],
  fallback?: React.ReactNode
) => {
  return function PermissionWrapper({ children }: { children: React.ReactNode }) {
    const { hasPermission, hasAnyPermission, loading } = usePermissions();

    if (loading) {
      return null; // or a loading spinner
    }

    const hasRequiredPermission = Array.isArray(permission)
      ? hasAnyPermission(permission)
      : hasPermission(permission);

    if (!hasRequiredPermission) {
      return fallback || null;
    }

    return <>{children}</>;
  };
};

// Hook for role-based access
export const useRoleAccess = () => {
  const { profile } = useAuth();
  
  const canAccessAdmin = () => {
    return profile?.role && ['admin', 'super_admin'].includes(profile.role);
  };

  const canAccessModerator = () => {
    return profile?.role && ['moderator', 'admin', 'super_admin'].includes(profile.role);
  };

  const canManageUsers = () => {
    return profile?.role && ['admin', 'super_admin'].includes(profile.role);
  };

  const canManageSystem = () => {
    return profile?.role === 'super_admin';
  };

  return {
    canAccessAdmin,
    canAccessModerator,
    canManageUsers,
    canManageSystem,
    userRole: profile?.role || 'user'
  };
};

// Permission constants for easy reference
export const PERMISSIONS = {
  // Documents
  DOCUMENTS_CREATE: 'documents.create',
  DOCUMENTS_READ: 'documents.read',
  DOCUMENTS_UPDATE: 'documents.update',
  DOCUMENTS_DELETE: 'documents.delete',
  DOCUMENTS_READ_ALL: 'documents.read_all',

  // Templates
  TEMPLATES_CREATE: 'templates.create',
  TEMPLATES_READ: 'templates.read',
  TEMPLATES_UPDATE: 'templates.update',
  TEMPLATES_DELETE: 'templates.delete',
  TEMPLATES_MODERATE: 'templates.moderate',

  // Law Firms
  LAW_FIRMS_CREATE: 'law_firms.create',
  LAW_FIRMS_READ: 'law_firms.read',
  LAW_FIRMS_UPDATE: 'law_firms.update',
  LAW_FIRMS_DELETE: 'law_firms.delete',
  LAW_FIRMS_VERIFY: 'law_firms.verify',
  LAW_FIRMS_MODERATE_REVIEWS: 'law_firms.moderate_reviews',

  // Users
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_MANAGE_ROLES: 'users.manage_roles',
  USERS_MANAGE_PERMISSIONS: 'users.manage_permissions',

  // System
  SYSTEM_ANALYTICS: 'system.analytics',
  SYSTEM_MONITORING: 'system.monitoring',
  SYSTEM_AUDIT_LOGS: 'system.audit_logs',
  SYSTEM_SETTINGS: 'system.settings'
} as const;
