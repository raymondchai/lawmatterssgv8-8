import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

export const profilesApi = {
  // Get current user profile
  async getCurrentProfile() {
    console.log('🔍 getCurrentProfile - Starting profile fetch...');

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('❌ getCurrentProfile - Auth error:', userError);
        throw userError;
      }
      if (!user) {
        console.error('❌ getCurrentProfile - No user authenticated');
        throw new Error('User not authenticated');
      }

      console.log('✅ getCurrentProfile - Auth User ID:', user.id);
      console.log('✅ getCurrentProfile - Auth User Email:', user.email);

    // Test Supabase connection first
    console.log('🔗 Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    console.log('🔗 Supabase connection test:', { testData, testError });

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    console.log('🔍 getCurrentProfile - Profile Query Result:', {
      data: data ? { id: data.id, email: data.email, role: data.role, subscription_tier: data.subscription_tier } : null,
      error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null,
      userId: user.id,
      queryUsed: `SELECT * FROM profiles WHERE id = '${user.id}'`
    });

    if (error) {
      console.error('Profile query error:', error);

      // Fallback: try to find profile by email
      if (user.email) {
        console.log('Trying fallback: searching profile by email...');
        const { data: emailData, error: emailError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', user.email)
          .single();

        console.log('Email-based profile query result:', { emailData, emailError });

        if (emailError) {
          console.error('Email-based profile query also failed:', emailError);
          throw error; // throw original error
        }

        return emailData as User;
      }

      throw error;
    }

    // Add final validation and debugging
    if (!data) {
      console.error('❌ getCurrentProfile - Profile data is null despite no error');
      throw new Error('Profile data is null');
    }

    console.log('✅ getCurrentProfile - Profile fetched successfully:', {
      email: data.email,
      role: data.role,
      subscription_tier: data.subscription_tier,
      id: data.id,
      roleType: typeof data.role,
      isSuperAdmin: data.role === 'super_admin'
    });

    return data as User;
    } catch (error) {
      console.error('❌ getCurrentProfile - Unexpected error:', error);
      throw error;
    }
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
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
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
