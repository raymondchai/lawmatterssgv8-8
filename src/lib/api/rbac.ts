import { supabase } from '@/lib/supabase';
import type { 
  UserRole, 
  Permission, 
  RolePermission, 
  UserPermission, 
  AuditLog, 
  UserWithPermissions,
  Profile 
} from '@/types';

export interface CreateUserPermissionData {
  user_id: string;
  permission_id: string;
  granted: boolean;
}

export interface AuditLogFilters {
  user_id?: string;
  action?: string;
  resource_type?: string;
  date_from?: Date;
  date_to?: Date;
}

export const rbacApi = {
  // Permission management
  async getPermissions(): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('resource', { ascending: true })
      .order('action', { ascending: true });

    if (error) {
      console.error('Error fetching permissions:', error);
      throw new Error('Failed to fetch permissions');
    }

    return data || [];
  },

  async getRolePermissions(role?: UserRole): Promise<RolePermission[]> {
    let query = supabase
      .from('role_permissions')
      .select(`
        *,
        permission:permissions(*)
      `)
      .order('role', { ascending: true });

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching role permissions:', error);
      throw new Error('Failed to fetch role permissions');
    }

    return data || [];
  },

  async updateRolePermissions(role: UserRole, permissionIds: string[]): Promise<void> {
    // First, delete existing permissions for this role
    const { error: deleteError } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role', role);

    if (deleteError) {
      console.error('Error deleting role permissions:', deleteError);
      throw new Error('Failed to update role permissions');
    }

    // Then, insert new permissions
    if (permissionIds.length > 0) {
      const rolePermissions = permissionIds.map(permissionId => ({
        role,
        permission_id: permissionId
      }));

      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert(rolePermissions);

      if (insertError) {
        console.error('Error inserting role permissions:', insertError);
        throw new Error('Failed to update role permissions');
      }
    }

    // Log the action
    await this.logAction('update_role_permissions', 'role_permissions', role, null, { 
      role, 
      permission_ids: permissionIds 
    });
  },

  // User management
  async getUsers(filters: { role?: UserRole; search?: string } = {}): Promise<UserWithPermissions[]> {
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.role) {
      query = query.eq('role', filters.role);
    }

    if (filters.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }

    return data || [];
  },

  async getUserWithPermissions(userId: string): Promise<UserWithPermissions | null> {
    const { data, error } = await supabase
      .rpc('get_user_permissions', { user_uuid: userId });

    if (error) {
      console.error('Error fetching user permissions:', error);
      throw new Error('Failed to fetch user permissions');
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    return {
      ...profile,
      permissions: data || []
    };
  },

  async updateUserRole(userId: string, role: UserRole): Promise<Profile> {
    const { data: oldProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user role:', error);
      throw new Error('Failed to update user role');
    }

    // Log the action
    await this.logAction('update_user_role', 'profiles', userId, 
      { role: oldProfile?.role }, 
      { role }
    );

    return data;
  },

  async deleteUser(userId: string): Promise<void> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }

    // Log the action
    await this.logAction('delete_user', 'profiles', userId, profile, null);
  },

  // User permissions management
  async getUserPermissions(userId: string): Promise<UserPermission[]> {
    const { data, error } = await supabase
      .from('user_permissions')
      .select(`
        *,
        permission:permissions(*),
        granted_by_user:profiles!user_permissions_granted_by_fkey(full_name, email)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user permissions:', error);
      throw new Error('Failed to fetch user permissions');
    }

    return data || [];
  },

  async grantUserPermission(data: CreateUserPermissionData): Promise<UserPermission> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: permission, error } = await supabase
      .from('user_permissions')
      .upsert({
        ...data,
        granted_by: user.id
      })
      .select(`
        *,
        permission:permissions(*)
      `)
      .single();

    if (error) {
      console.error('Error granting user permission:', error);
      throw new Error('Failed to grant user permission');
    }

    // Log the action
    await this.logAction('grant_user_permission', 'user_permissions', permission.id, null, data);

    return permission;
  },

  async revokeUserPermission(userId: string, permissionId: string): Promise<void> {
    const { error } = await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('permission_id', permissionId);

    if (error) {
      console.error('Error revoking user permission:', error);
      throw new Error('Failed to revoke user permission');
    }

    // Log the action
    await this.logAction('revoke_user_permission', 'user_permissions', `${userId}-${permissionId}`, 
      { user_id: userId, permission_id: permissionId }, null);
  },

  // Permission checking
  async hasPermission(permissionName: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .rpc('user_has_permission', { 
        user_uuid: user.id, 
        permission_name: permissionName 
      });

    if (error) {
      console.error('Error checking permission:', error);
      return false;
    }

    return data || false;
  },

  async getUserPermissionsList(userId?: string): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    
    if (!targetUserId) return [];

    const { data, error } = await supabase
      .rpc('get_user_permissions', { user_uuid: targetUserId });

    if (error) {
      console.error('Error fetching user permissions list:', error);
      return [];
    }

    return (data || [])
      .filter((perm: any) => perm.granted_by_role || perm.granted_individually)
      .map((perm: any) => perm.permission_name);
  },

  // Audit logging
  async getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLog[]> {
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:profiles(full_name, email, role)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters.action) {
      query = query.eq('action', filters.action);
    }

    if (filters.resource_type) {
      query = query.eq('resource_type', filters.resource_type);
    }

    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from.toISOString());
    }

    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      throw new Error('Failed to fetch audit logs');
    }

    return data || [];
  },

  async logAction(
    action: string,
    resourceType: string,
    resourceId?: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .rpc('log_admin_action', {
        user_uuid: user.id,
        action_name: action,
        resource_type_name: resourceType,
        resource_id_value: resourceId,
        old_values_json: oldValues,
        new_values_json: newValues,
        ip_addr: ipAddress,
        user_agent_string: userAgent
      });

    if (error) {
      console.error('Error logging action:', error);
    }
  },

  // Bulk operations
  async bulkUpdateUserRoles(userIds: string[], role: UserRole): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .in('id', userIds);

    if (error) {
      console.error('Error bulk updating user roles:', error);
      throw new Error('Failed to bulk update user roles');
    }

    // Log the action
    await this.logAction('bulk_update_user_roles', 'profiles', userIds.join(','), 
      null, 
      { user_ids: userIds, role }
    );
  },

  async bulkDeleteUsers(userIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .in('id', userIds);

    if (error) {
      console.error('Error bulk deleting users:', error);
      throw new Error('Failed to bulk delete users');
    }

    // Log the action
    await this.logAction('bulk_delete_users', 'profiles', userIds.join(','), 
      { user_ids: userIds }, 
      null
    );
  }
};
