import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, CreditCard, Calendar } from 'lucide-react';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { stripeService } from '@/lib/services/stripe';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const sessionId = searchParams.get('session_id');
  const subscriptionType = searchParams.get('subscription');

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    // Load subscription information
    loadSubscriptionInfo();
  }, [user]);

  const loadSubscriptionInfo = async () => {
    try {
      const subscriptionData = await stripeService.getCurrentSubscription();
      setSubscription(subscriptionData);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigate('/dashboard');
  };

  const handleViewSubscription = () => {
    navigate('/dashboard/subscription');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h1>
          
          <p className="text-xl text-gray-600 mb-8">
            Thank you for subscribing to LawMattersSG. Your account has been upgraded successfully.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Subscription Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Subscription Details
              </CardTitle>
              <CardDescription>
                Your new subscription is now active
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
              ) : subscription ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Plan</span>
                    <Badge variant="default" className="capitalize">
                      {subscription.tier}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Status</span>
                    <Badge variant="secondary" className="capitalize">
                      {subscription.status}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Next Billing</span>
                    <span className="text-sm text-gray-900">
                      {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Plan</span>
                  <Badge variant="default" className="capitalize">
                    {profile?.subscription_tier || 'Premium'}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* What's Next */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                What's Next?
              </CardTitle>
              <CardDescription>
                Get started with your new features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Access Premium Features</p>
                    <p className="text-xs text-gray-600">Start using advanced AI tools and templates</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Increased Limits</p>
                    <p className="text-xs text-gray-600">Enjoy higher monthly usage limits</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Priority Support</p>
                    <p className="text-xs text-gray-600">Get faster response times for support</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={handleContinue} size="lg" className="flex items-center">
            Continue to Dashboard
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          
          <Button variant="outline" onClick={handleViewSubscription} size="lg">
            Manage Subscription
          </Button>
        </div>

        {/* Additional Information */}
        <div className="mt-12 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Important Information
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• You will receive a confirmation email shortly with your receipt</li>
            <li>• Your subscription will automatically renew at the end of each billing period</li>
            <li>• You can cancel or modify your subscription at any time from your account settings</li>
            <li>• If you have any questions, please contact our support team</li>
          </ul>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PaymentSuccess;
