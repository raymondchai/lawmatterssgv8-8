import { supabase } from '@/lib/supabase';
import { SUBSCRIPTION_TIERS } from '@/lib/config/constants';
import type { SubscriptionTier } from '@/types';

export type ResourceType = 'ai_query' | 'document_upload' | 'document_download' | 'custom_document';

export interface UsageLimit {
  allowed: boolean;
  limit: number;
  current: number;
  remaining: number;
  tier: SubscriptionTier;
  percentage: number;
}

export interface UsageStats {
  ai_queries: number;
  document_uploads: number;
  document_downloads: number;
  custom_documents: number;
}

class UsageTrackingService {
  /**
   * Check if user can perform a specific operation
   */
  async checkUsageLimit(resourceType: ResourceType): Promise<UsageLimit> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Use the database function we created
    const { data, error } = await supabase.rpc('check_subscription_limit', {
      p_user_id: user.id,
      p_resource_type: resourceType
    });

    if (error) {
      console.error('Error checking usage limit:', error);
      throw new Error(`Failed to check usage limit: ${error.message}`);
    }

    const result = data as {
      allowed: boolean;
      limit: number;
      current_usage: number;
      remaining: number;
      tier: SubscriptionTier;
    };

    return {
      allowed: result.allowed,
      limit: result.limit,
      current: result.current_usage,
      remaining: result.remaining,
      tier: result.tier,
      percentage: result.limit > 0 ? (result.current_usage / result.limit) * 100 : 0
    };
  }

  /**
   * Increment usage for a specific resource type
   */
  async incrementUsage(
    resourceType: ResourceType, 
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Use the database function we created
    const { error } = await supabase.rpc('increment_usage', {
      p_user_id: user.id,
      p_resource_type: resourceType,
      p_resource_id: resourceId || null,
      p_metadata: metadata || {}
    });

    if (error) {
      console.error('Error incrementing usage:', error);
      throw new Error(`Failed to increment usage: ${error.message}`);
    }

    // Check if we should create usage alerts
    await this.checkAndCreateUsageAlerts(user.id, resourceType);
  }

  /**
   * Get current month's usage statistics
   */
  async getUsageStats(): Promise<UsageStats> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const nextMonth = this.getNextMonth(currentMonth);

    // Get usage for each resource type
    const { data: usageData, error } = await supabase
      .from('usage_tracking')
      .select('resource_type, usage_count')
      .eq('user_id', user.id)
      .gte('usage_date', `${currentMonth}-01`)
      .lt('usage_date', `${nextMonth}-01`);

    if (error) {
      console.error('Error fetching usage stats:', error);
      throw new Error(`Failed to fetch usage stats: ${error.message}`);
    }

    // Aggregate usage by resource type
    const stats: UsageStats = {
      ai_queries: 0,
      document_uploads: 0,
      document_downloads: 0,
      custom_documents: 0
    };

    usageData?.forEach(item => {
      if (item.resource_type in stats) {
        stats[item.resource_type as keyof UsageStats] += item.usage_count;
      }
    });

    return stats;
  }

  /**
   * Get usage limits for current user's subscription tier
   */
  async getUserLimits(): Promise<Record<ResourceType, number>> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const tier = profile?.subscription_tier || 'free';
    const tierConfig = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];

    return {
      ai_query: tierConfig.limits.monthlyAiRequests,
      document_upload: tierConfig.limits.monthlyDocumentUploads,
      document_download: tierConfig.limits.monthlyDocumentUploads, // Using same limit for now
      custom_document: tierConfig.limits.customDocumentDownloads
    };
  }

  /**
   * Check if user has reached usage limits and create alerts
   */
  private async checkAndCreateUsageAlerts(userId: string, resourceType: ResourceType): Promise<void> {
    try {
      const usageLimit = await this.checkUsageLimit(resourceType);
      
      // Create alert if user has reached 80% of their limit
      if (usageLimit.percentage >= 80 && usageLimit.percentage < 100) {
        await supabase.rpc('create_billing_alert', {
          p_user_id: userId,
          p_alert_type: 'usage_limit_warning',
          p_resource_type: resourceType,
          p_threshold_percentage: Math.round(usageLimit.percentage)
        });
      }
      
      // Create alert if user has reached 100% of their limit
      if (usageLimit.percentage >= 100) {
        await supabase.rpc('create_billing_alert', {
          p_user_id: userId,
          p_alert_type: 'usage_limit_reached',
          p_resource_type: resourceType,
          p_threshold_percentage: 100
        });
      }
    } catch (error) {
      console.error('Error checking usage alerts:', error);
      // Don't throw error here as it's not critical
    }
  }

  /**
   * Get user's billing alerts
   */
  async getBillingAlerts(unreadOnly: boolean = false): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    let query = supabase
      .from('billing_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching billing alerts:', error);
      throw new Error(`Failed to fetch billing alerts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Mark billing alert as read
   */
  async markAlertAsRead(alertId: string): Promise<void> {
    const { error } = await supabase
      .from('billing_alerts')
      .update({ is_read: true })
      .eq('id', alertId);

    if (error) {
      console.error('Error marking alert as read:', error);
      throw new Error(`Failed to mark alert as read: ${error.message}`);
    }
  }

  /**
   * Check if user can perform operation and increment usage if allowed
   */
  async checkAndIncrementUsage(
    resourceType: ResourceType,
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<{ allowed: boolean; limit?: UsageLimit }> {
    const limit = await this.checkUsageLimit(resourceType);
    
    if (!limit.allowed) {
      return { allowed: false, limit };
    }

    await this.incrementUsage(resourceType, resourceId, metadata);
    return { allowed: true, limit };
  }

  private getNextMonth(currentMonth: string): string {
    const [year, month] = currentMonth.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return `${nextYear}-${nextMonth.toString().padStart(2, '0')}`;
  }
}

// Export singleton instance
export const usageTrackingService = new UsageTrackingService();

// Export types
export type { UsageLimit, UsageStats };
