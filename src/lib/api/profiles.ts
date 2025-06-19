import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

export const profilesApi = {
  // Get current user profile
  async getCurrentProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .single();
    
    if (error) throw error;
    return data as User;
  },

  // Update user profile
  async updateProfile(updates: Partial<User>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .select()
      .single();

    if (error) throw error;
    return data as User;
  },

  // Get user usage statistics
  async getUserUsage() {
    const { data, error } = await supabase
      .from('user_usage')
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  // Check if user can perform operation
  async checkUsageLimit(operationType: string) {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .rpc('check_usage_limits', {
        user_id: user.data.user.id,
        operation_type: operationType
      });

    if (error) throw error;
    return data as boolean;
  },

  // Increment usage counter
  async incrementUsage(operationType: string) {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('User not authenticated');

    const { error } = await supabase
      .rpc('increment_usage', {
        user_id: user.data.user.id,
        operation_type: operationType
      });

    if (error) throw error;
  }
};
