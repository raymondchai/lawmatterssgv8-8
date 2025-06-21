import { supabase } from '@/lib/supabase';
import { SUBSCRIPTION_TIERS } from '@/lib/config/constants';

export type SubscriptionTier = 'free' | 'premium' | 'pro' | 'enterprise';
export type TemplateAccessLevel = 'public' | 'premium' | 'enterprise';

export interface AccessControlResult {
  hasAccess: boolean;
  reason?: string;
  upgradeRequired?: SubscriptionTier;
  remainingUsage?: number;
  resetDate?: Date;
}

export interface UserSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export interface UsageStats {
  templatesUsedThisMonth: number;
  templatesUsedToday: number;
  customizationsThisMonth: number;
  downloadsThisMonth: number;
  lastResetDate: Date;
}

class TemplateAccessControlService {
  /**
   * Check if user has access to a specific template
   */
  async checkTemplateAccess(
    userId: string | null,
    templateAccessLevel: TemplateAccessLevel,
    templateId?: string
  ): Promise<AccessControlResult> {
    // Public templates are always accessible
    if (templateAccessLevel === 'public') {
      return { hasAccess: true };
    }

    // Anonymous users can only access public templates
    if (!userId) {
      return {
        hasAccess: false,
        reason: 'Authentication required for premium templates',
        upgradeRequired: 'premium'
      };
    }

    try {
      // Get user's subscription
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        return {
          hasAccess: false,
          reason: 'No active subscription found',
          upgradeRequired: templateAccessLevel === 'enterprise' ? 'enterprise' : 'premium'
        };
      }

      // Check subscription status
      if (subscription.status !== 'active') {
        return {
          hasAccess: false,
          reason: 'Subscription is not active',
          upgradeRequired: templateAccessLevel === 'enterprise' ? 'enterprise' : 'premium'
        };
      }

      // Check if subscription tier allows access to this template level
      const hasRequiredTier = this.checkTierAccess(subscription.tier, templateAccessLevel);
      
      if (!hasRequiredTier) {
        return {
          hasAccess: false,
          reason: `${templateAccessLevel} template requires ${templateAccessLevel === 'enterprise' ? 'Enterprise' : 'Premium'} subscription`,
          upgradeRequired: templateAccessLevel === 'enterprise' ? 'enterprise' : 'premium'
        };
      }

      // Check usage limits
      const usageCheck = await this.checkUsageLimits(userId, subscription.tier);
      
      if (!usageCheck.hasAccess) {
        return usageCheck;
      }

      return { 
        hasAccess: true,
        remainingUsage: usageCheck.remainingUsage,
        resetDate: usageCheck.resetDate
      };

    } catch (error) {
      console.error('Error checking template access:', error);
      return {
        hasAccess: false,
        reason: 'Error checking access permissions'
      };
    }
  }

  /**
   * Check if user can customize templates
   */
  async checkCustomizationAccess(userId: string, templateAccessLevel: TemplateAccessLevel): Promise<AccessControlResult> {
    return this.checkTemplateAccess(userId, templateAccessLevel);
  }

  /**
   * Check if user can download in specific format
   */
  async checkDownloadAccess(
    userId: string | null,
    templateAccessLevel: TemplateAccessLevel,
    format: 'pdf' | 'docx' | 'html'
  ): Promise<AccessControlResult> {
    // Check basic template access first
    const templateAccess = await this.checkTemplateAccess(userId, templateAccessLevel);
    
    if (!templateAccess.hasAccess) {
      return templateAccess;
    }

    // Anonymous users can only download PDF
    if (!userId && format !== 'pdf') {
      return {
        hasAccess: false,
        reason: 'Account required for DOCX and HTML downloads',
        upgradeRequired: 'premium'
      };
    }

    if (!userId) {
      return { hasAccess: true }; // PDF download for public templates
    }

    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        return format === 'pdf' ? { hasAccess: true } : {
          hasAccess: false,
          reason: 'Premium subscription required for DOCX and HTML downloads',
          upgradeRequired: 'premium'
        };
      }

      // Check format-specific restrictions
      const tierConfig = SUBSCRIPTION_TIERS[subscription.tier];
      
      // Free tier: PDF only
      if (subscription.tier === 'free' && format !== 'pdf') {
        return {
          hasAccess: false,
          reason: 'Premium subscription required for DOCX and HTML downloads',
          upgradeRequired: 'premium'
        };
      }

      return { hasAccess: true };

    } catch (error) {
      console.error('Error checking download access:', error);
      return {
        hasAccess: false,
        reason: 'Error checking download permissions'
      };
    }
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch subscription: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      tier: data.tier,
      status: data.status,
      currentPeriodStart: new Date(data.current_period_start),
      currentPeriodEnd: new Date(data.current_period_end),
      cancelAtPeriodEnd: data.cancel_at_period_end
    };
  }

  /**
   * Get user's usage statistics
   */
  async getUserUsageStats(userId: string): Promise<UsageStats> {
    const { data, error } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch usage stats: ${error.message}`);
    }

    if (!data) {
      // Return default stats if no record exists
      return {
        templatesUsedThisMonth: 0,
        templatesUsedToday: 0,
        customizationsThisMonth: 0,
        downloadsThisMonth: 0,
        lastResetDate: new Date()
      };
    }

    return {
      templatesUsedThisMonth: data.templates_used_this_month || 0,
      templatesUsedToday: data.templates_used_today || 0,
      customizationsThisMonth: data.customizations_this_month || 0,
      downloadsThisMonth: data.downloads_this_month || 0,
      lastResetDate: new Date(data.last_reset_date)
    };
  }

  /**
   * Record template usage
   */
  async recordTemplateUsage(userId: string, action: 'view' | 'customize' | 'download'): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_template_usage', {
        p_user_id: userId,
        p_action: action
      });

      if (error) {
        console.error('Error recording template usage:', error);
      }
    } catch (error) {
      console.error('Error recording template usage:', error);
    }
  }

  /**
   * Check if subscription tier allows access to template level
   */
  private checkTierAccess(userTier: SubscriptionTier, templateLevel: TemplateAccessLevel): boolean {
    const tierHierarchy = {
      free: 0,
      premium: 1,
      pro: 2,
      enterprise: 3
    };

    const levelRequirements = {
      public: 0,
      premium: 1,
      enterprise: 3
    };

    return tierHierarchy[userTier] >= levelRequirements[templateLevel];
  }

  /**
   * Check usage limits for subscription tier
   */
  private async checkUsageLimits(userId: string, tier: SubscriptionTier): Promise<AccessControlResult> {
    try {
      const usage = await this.getUserUsageStats(userId);
      const limits = SUBSCRIPTION_TIERS[tier].limits;

      // Check monthly template limit
      if (limits.monthlyDocumentUploads !== -1 && usage.templatesUsedThisMonth >= limits.monthlyDocumentUploads) {
        return {
          hasAccess: false,
          reason: `Monthly template limit reached (${limits.monthlyDocumentUploads})`,
          upgradeRequired: tier === 'free' ? 'premium' : tier === 'premium' ? 'pro' : 'enterprise',
          remainingUsage: 0,
          resetDate: this.getNextResetDate(usage.lastResetDate)
        };
      }

      // Check daily template limit
      if (limits.dailyDocumentUploads !== -1 && usage.templatesUsedToday >= limits.dailyDocumentUploads) {
        return {
          hasAccess: false,
          reason: `Daily template limit reached (${limits.dailyDocumentUploads})`,
          remainingUsage: 0,
          resetDate: this.getTomorrowDate()
        };
      }

      const remainingMonthly = limits.monthlyDocumentUploads === -1 
        ? -1 
        : limits.monthlyDocumentUploads - usage.templatesUsedThisMonth;

      const remainingDaily = limits.dailyDocumentUploads === -1 
        ? -1 
        : limits.dailyDocumentUploads - usage.templatesUsedToday;

      return {
        hasAccess: true,
        remainingUsage: remainingMonthly === -1 ? remainingDaily : Math.min(remainingMonthly, remainingDaily),
        resetDate: this.getNextResetDate(usage.lastResetDate)
      };

    } catch (error) {
      console.error('Error checking usage limits:', error);
      return { hasAccess: true }; // Allow access if we can't check limits
    }
  }

  /**
   * Get next monthly reset date
   */
  private getNextResetDate(lastReset: Date): Date {
    const nextReset = new Date(lastReset);
    nextReset.setMonth(nextReset.getMonth() + 1);
    return nextReset;
  }

  /**
   * Get tomorrow's date
   */
  private getTomorrowDate(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}

export const templateAccessControlService = new TemplateAccessControlService();
