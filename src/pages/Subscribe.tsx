import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Shield, Check, Crown, Zap } from 'lucide-react';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { SUBSCRIPTION_TIERS } from '@/lib/config/constants';
import { stripeService } from '@/lib/services/stripe';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Subscribe = () => {
  const { tier } = useParams<{ tier: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isYearly, setIsYearly] = useState(searchParams.get('billing') === 'yearly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    if (!tier || !['premium', 'pro'].includes(tier)) {
      navigate('/pricing');
      return;
    }
  }, [user, tier, navigate]);

  const handleSubscribe = async () => {
    if (!tier || !['premium', 'pro'].includes(tier)) {
      setError('Invalid subscription tier');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await stripeService.subscribeTo(
        tier as 'premium' | 'pro',
        isYearly ? 'yearly' : 'monthly',
        {
          successUrl: `${window.location.origin}/payment/success`,
          cancelUrl: `${window.location.origin}/pricing?subscription=cancelled`,
          metadata: {
            source: 'subscribe_page'
          }
        }
      );
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start subscription process');
      toast({
        title: 'Subscription Error',
        description: 'Failed to start subscription process. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || !tier || !['premium', 'pro'].includes(tier)) {
    return null;
  }

  const tierInfo = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];
  const monthlyPrice = tierInfo.price || 0;
  const yearlyPrice = Math.round(monthlyPrice * 10); // 20% discount for yearly
  const currentPrice = isYearly ? yearlyPrice : monthlyPrice;
  const savings = isYearly ? monthlyPrice * 12 - yearlyPrice : 0;

  const getTierIcon = () => {
    switch (tier) {
      case 'premium':
        return <Zap className="h-8 w-8 text-blue-500" />;
      case 'pro':
        return <Crown className="h-8 w-8 text-purple-500" />;
      default:
        return <CreditCard className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Subscribe to {tierInfo.name}
          </h1>
          <p className="text-xl text-gray-600">
            Complete your subscription to unlock premium features
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Plan Details */}
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center space-x-3">
                {getTierIcon()}
                <div>
                  <CardTitle className="text-2xl">{tierInfo.name} Plan</CardTitle>
                  <CardDescription>
                    Perfect for {tier === 'premium' ? 'individuals and small businesses' : 'growing businesses and teams'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Billing Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <span className={`text-sm font-medium ${!isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
                    Monthly
                  </span>
                  <Switch
                    checked={isYearly}
                    onCheckedChange={setIsYearly}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <span className={`text-sm font-medium ${isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
                    Yearly
                  </span>
                  {isYearly && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Save ${savings}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div className="text-center p-6 bg-blue-50 rounded-lg">
                <div className="text-4xl font-bold text-gray-900">
                  ${currentPrice}
                </div>
                <div className="text-gray-600">
                  per {isYearly ? 'year' : 'month'}
                </div>
                {isYearly && (
                  <div className="text-sm text-green-600 mt-2">
                    Save 20% with yearly billing
                  </div>
                )}
              </div>

              {/* Features */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">What's included:</h3>
                <ul className="space-y-2">
                  {tierInfo.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Form */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Complete Your Subscription
              </CardTitle>
              <CardDescription>
                Secure payment powered by Stripe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Security Notice */}
              <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
                <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900">Secure Payment</p>
                  <p className="text-xs text-green-700">
                    Your payment information is encrypted and secure. We use Stripe for payment processing.
                  </p>
                </div>
              </div>

              {/* Subscription Summary */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Plan</span>
                  <span className="text-sm font-medium">{tierInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Billing</span>
                  <span className="text-sm font-medium">{isYearly ? 'Yearly' : 'Monthly'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Price</span>
                  <span className="text-sm font-medium">${currentPrice}/{isYearly ? 'year' : 'month'}</span>
                </div>
                {isYearly && (
                  <div className="flex justify-between text-green-600">
                    <span className="text-sm">Savings</span>
                    <span className="text-sm font-medium">${savings}/year</span>
                  </div>
                )}
              </div>

              {/* Subscribe Button */}
              <Button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Subscribe Now
                  </>
                )}
              </Button>

              {/* Terms */}
              <p className="text-xs text-gray-500 text-center">
                By subscribing, you agree to our{' '}
                <a href="/terms" className="underline hover:text-gray-700">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="underline hover:text-gray-700">
                  Privacy Policy
                </a>
                . You can cancel anytime.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Subscribe;
