import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  Settings, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Crown,
  Zap,
  Star
} from 'lucide-react';
import { stripeService, type SubscriptionInfo } from '@/lib/services/stripe';
import { SUBSCRIPTION_TIERS } from '@/lib/config/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { SubscriptionTier } from '@/types';

interface UsageInfo {
  current: Record<string, number>;
  limits: Record<string, number>;
  tier: SubscriptionTier;
}

export const SubscriptionManager = () => {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const [subscriptionData, usageData] = await Promise.all([
        stripeService.getCurrentSubscription(),
        stripeService.getUsageInfo()
      ]);
      
      setSubscription(subscriptionData);
      setUsage(usageData);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscription information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: 'premium' | 'pro') => {
    try {
      setActionLoading(true);
      await stripeService.subscribeTo(tier);
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to upgrade subscription',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setActionLoading(true);
      await stripeService.cancelSubscription();
      await loadSubscriptionData();
      toast({
        title: 'Success',
        description: 'Subscription cancelled. You can continue using your plan until the end of the billing period.',
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      setActionLoading(true);
      await stripeService.reactivateSubscription();
      await loadSubscriptionData();
      toast({
        title: 'Success',
        description: 'Subscription reactivated successfully.',
      });
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to reactivate subscription',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setActionLoading(true);
      await stripeService.createBillingPortalSession();
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast({
        title: 'Error',
        description: 'Failed to open billing portal',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getUsagePercentage = (current: number, limit: number): number => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'canceled':
      case 'incomplete':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getTierIcon = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'premium':
        return <Zap className="h-5 w-5 text-blue-500" />;
      case 'pro':
        return <Crown className="h-5 w-5 text-purple-500" />;
      default:
        return <Star className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  const currentTier = profile?.subscription_tier || 'free';
  const tierInfo = SUBSCRIPTION_TIERS[currentTier as keyof typeof SUBSCRIPTION_TIERS];

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getTierIcon(currentTier)}
              <div>
                <CardTitle className="text-xl">Current Plan</CardTitle>
                <CardDescription>
                  Manage your subscription and billing
                </CardDescription>
              </div>
            </div>
            {subscription && getStatusIcon(subscription.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold capitalize">{tierInfo.name}</h3>
              <p className="text-sm text-gray-600">
                {tierInfo.price === 0 ? 'Free forever' : 
                 tierInfo.price === null ? 'Custom pricing' :
                 `$${tierInfo.price}/${tierInfo.period}`}
              </p>
            </div>
            <Badge variant={subscription?.status === 'active' ? 'default' : 'secondary'}>
              {subscription?.status || 'Free'}
            </Badge>
          </div>

          {subscription && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Billing Period</span>
                <span>
                  {new Date(subscription.current_period_start * 1000).toLocaleDateString()} - {' '}
                  {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
                </span>
              </div>
              
              {subscription.cancel_at_period_end && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your subscription will be cancelled at the end of the current billing period.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <Separator />

          <div className="flex flex-wrap gap-2">
            {currentTier === 'free' && (
              <>
                <Button onClick={() => handleUpgrade('premium')} disabled={actionLoading}>
                  <Zap className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleUpgrade('pro')} 
                  disabled={actionLoading}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </>
            )}
            
            {currentTier === 'premium' && (
              <Button 
                variant="outline" 
                onClick={() => handleUpgrade('pro')} 
                disabled={actionLoading}
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
            )}

            {subscription && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleManageBilling}
                  disabled={actionLoading}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Billing
                </Button>
                
                {subscription.cancel_at_period_end ? (
                  <Button 
                    variant="outline" 
                    onClick={handleReactivateSubscription}
                    disabled={actionLoading}
                  >
                    Reactivate Subscription
                  </Button>
                ) : (
                  <Button 
                    variant="destructive" 
                    onClick={handleCancelSubscription}
                    disabled={actionLoading}
                  >
                    Cancel Subscription
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Information */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Usage This Month
            </CardTitle>
            <CardDescription>
              Track your usage against plan limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>AI Queries</span>
                  <span>
                    {usage.current.aiQueries || 0} / {usage.limits.aiQueries === -1 ? '∞' : usage.limits.aiQueries}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(usage.current.aiQueries || 0, usage.limits.aiQueries)} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Document Downloads</span>
                  <span>
                    {usage.current.documentDownloads || 0} / {usage.limits.documentDownloads === -1 ? '∞' : usage.limits.documentDownloads}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(usage.current.documentDownloads || 0, usage.limits.documentDownloads)} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Custom Documents</span>
                  <span>
                    {usage.current.customDocuments || 0} / {usage.limits.customDocuments === -1 ? '∞' : usage.limits.customDocuments || 0}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(usage.current.customDocuments || 0, usage.limits.customDocuments || 0)} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Document Uploads</span>
                  <span>
                    {usage.current.documentUploads || 0} / {usage.limits.documentUploads === -1 ? '∞' : usage.limits.documentUploads}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(usage.current.documentUploads || 0, usage.limits.documentUploads)} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
