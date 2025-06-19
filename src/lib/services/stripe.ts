import { loadStripe, Stripe } from '@stripe/stripe-js';
import { config } from '@/lib/config/env';
import { STRIPE_PRICE_IDS } from '@/lib/config/constants';
import { supabase } from '@/lib/supabase';
import type { SubscriptionTier } from '@/types';

// Initialize Stripe
let stripePromise: Promise<Stripe | null>;

const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(config.stripe.publishableKey || '');
  }
  return stripePromise;
};

export interface CreateSubscriptionParams {
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}

export interface SubscriptionInfo {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  tier: SubscriptionTier;
  price_id: string;
}

export interface BillingPortalParams {
  returnUrl?: string;
}

class StripeService {
  private stripe: Promise<Stripe | null>;

  constructor() {
    this.stripe = getStripe();
  }

  /**
   * Create a subscription checkout session
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create subscription');
    }

    const { data, error } = await supabase.functions.invoke('create-subscription', {
      body: {
        priceId: params.priceId,
        successUrl: params.successUrl || `${window.location.origin}/dashboard?subscription=success`,
        cancelUrl: params.cancelUrl || `${window.location.origin}/pricing?subscription=cancelled`,
        metadata: params.metadata || {}
      }
    });

    if (error) {
      console.error('Error creating subscription:', error);
      throw new Error(error.message || 'Failed to create subscription');
    }

    if (!data?.url) {
      throw new Error('No checkout URL returned from server');
    }

    // Redirect to Stripe Checkout
    window.location.href = data.url;
  }

  /**
   * Get subscription price ID for a tier and billing period
   */
  getPriceId(tier: 'premium' | 'pro', billing: 'monthly' | 'yearly' = 'monthly'): string {
    const tierPrices = STRIPE_PRICE_IDS[tier];
    if (!tierPrices) {
      throw new Error(`No price configuration found for tier: ${tier}`);
    }

    const priceId = billing === 'yearly' ? tierPrices.yearly : tierPrices.monthly;
    if (!priceId) {
      throw new Error(`No price ID found for ${tier} ${billing}`);
    }

    return priceId;
  }

  /**
   * Subscribe to a specific tier
   */
  async subscribeTo(
    tier: 'premium' | 'pro', 
    billing: 'monthly' | 'yearly' = 'monthly',
    options?: {
      successUrl?: string;
      cancelUrl?: string;
      metadata?: Record<string, string>;
    }
  ): Promise<void> {
    const priceId = this.getPriceId(tier, billing);
    
    await this.createSubscription({
      priceId,
      successUrl: options?.successUrl,
      cancelUrl: options?.cancelUrl,
      metadata: {
        tier,
        billing,
        ...options?.metadata
      }
    });
  }

  /**
   * Get current user's subscription information
   */
  async getCurrentSubscription(): Promise<SubscriptionInfo | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const { data, error } = await supabase.functions.invoke('get-subscription', {
      body: { userId: user.id }
    });

    if (error) {
      console.error('Error fetching subscription:', error);
      throw new Error(error.message || 'Failed to fetch subscription');
    }

    return data?.subscription || null;
  }

  /**
   * Cancel subscription at period end
   */
  async cancelSubscription(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const { error } = await supabase.functions.invoke('cancel-subscription', {
      body: { userId: user.id }
    });

    if (error) {
      console.error('Error cancelling subscription:', error);
      throw new Error(error.message || 'Failed to cancel subscription');
    }
  }

  /**
   * Reactivate a cancelled subscription
   */
  async reactivateSubscription(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const { error } = await supabase.functions.invoke('reactivate-subscription', {
      body: { userId: user.id }
    });

    if (error) {
      console.error('Error reactivating subscription:', error);
      throw new Error(error.message || 'Failed to reactivate subscription');
    }
  }

  /**
   * Create billing portal session
   */
  async createBillingPortalSession(params?: BillingPortalParams): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const { data, error } = await supabase.functions.invoke('create-billing-portal', {
      body: {
        returnUrl: params?.returnUrl || `${window.location.origin}/dashboard/subscription`
      }
    });

    if (error) {
      console.error('Error creating billing portal session:', error);
      throw new Error(error.message || 'Failed to create billing portal session');
    }

    if (!data?.url) {
      throw new Error('No billing portal URL returned from server');
    }

    // Redirect to Stripe billing portal
    window.location.href = data.url;
  }

  /**
   * Update subscription to a different tier
   */
  async updateSubscription(
    newTier: 'premium' | 'pro',
    billing: 'monthly' | 'yearly' = 'monthly'
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const newPriceId = this.getPriceId(newTier, billing);

    const { error } = await supabase.functions.invoke('update-subscription', {
      body: {
        userId: user.id,
        newPriceId,
        metadata: {
          tier: newTier,
          billing
        }
      }
    });

    if (error) {
      console.error('Error updating subscription:', error);
      throw new Error(error.message || 'Failed to update subscription');
    }
  }

  /**
   * Get subscription usage and limits
   */
  async getUsageInfo(): Promise<{
    current: Record<string, number>;
    limits: Record<string, number>;
    tier: SubscriptionTier;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const { data, error } = await supabase.functions.invoke('get-usage-info', {
      body: { userId: user.id }
    });

    if (error) {
      console.error('Error fetching usage info:', error);
      throw new Error(error.message || 'Failed to fetch usage information');
    }

    return data;
  }
}

// Export singleton instance
export const stripeService = new StripeService();

// Export utility functions
export { getStripe };

// Export types
export type { CreateSubscriptionParams, SubscriptionInfo, BillingPortalParams };
