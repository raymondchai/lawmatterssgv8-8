import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, Star, Zap, Crown, Building2 } from 'lucide-react';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { SUBSCRIPTION_TIERS } from '@/lib/config/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Pricing = () => {
  const [isYearly, setIsYearly] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubscribe = (tier: string) => {
    if (!user) {
      navigate('/auth/login');
      return;
    }
    
    if (tier === 'free') {
      // Already free, redirect to dashboard
      navigate('/dashboard');
      return;
    }
    
    if (tier === 'enterprise') {
      // Contact sales for enterprise
      window.location.href = 'mailto:sales@lawmatterssg.com?subject=Enterprise Plan Inquiry';
      return;
    }
    
    // For premium and pro, redirect to subscription flow
    navigate(`/subscribe/${tier}${isYearly ? '?billing=yearly' : ''}`);
  };

  const getPrice = (tier: any) => {
    if (tier.price === null) return 'Custom';
    if (tier.price === 0) return 'Free';
    
    const price = isYearly ? tier.price * 10 : tier.price; // 20% discount for yearly
    return `$${price}`;
  };

  const getPeriod = (tier: any) => {
    if (tier.price === null || tier.price === 0) return '';
    return isYearly ? '/year' : '/month';
  };

  const getYearlyDiscount = (tier: any) => {
    if (tier.price === null || tier.price === 0) return null;
    return isYearly ? 'Save 20%' : null;
  };

  const tiers = [
    {
      key: 'free',
      ...SUBSCRIPTION_TIERS.free,
      icon: Star,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    },
    {
      key: 'premium',
      ...SUBSCRIPTION_TIERS.premium,
      icon: Zap,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      popular: true
    },
    {
      key: 'pro',
      ...SUBSCRIPTION_TIERS.pro,
      icon: Crown,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      key: 'enterprise',
      ...SUBSCRIPTION_TIERS.enterprise,
      icon: Building2,
      color: 'text-gray-800',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      {/* Header Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Choose the plan that works best for your legal needs, with no hidden fees or long-term commitments.
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 mb-12">
            <span className={`text-sm font-medium ${!isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
              Monthly
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
              className="data-[state=checked]:bg-blue-600"
            />
            <span className={`text-sm font-medium ${isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
              Annual
            </span>
            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
              Save 20%
            </Badge>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 -mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {tiers.map((tier) => {
              const Icon = tier.icon;
              const yearlyDiscount = getYearlyDiscount(tier);
              
              return (
                <Card 
                  key={tier.key}
                  className={`relative ${tier.borderColor} ${tier.popular ? 'ring-2 ring-blue-500 shadow-xl scale-105' : 'shadow-lg'} transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
                >
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-600 text-white px-4 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className={`text-center ${tier.bgColor} rounded-t-lg`}>
                    <div className={`inline-flex items-center justify-center w-12 h-12 ${tier.color} mb-4 mx-auto`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">
                      {tier.name}
                    </CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900">
                        {getPrice(tier)}
                      </span>
                      <span className="text-gray-600 ml-1">
                        {getPeriod(tier)}
                      </span>
                      {yearlyDiscount && (
                        <div className="mt-1">
                          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                            {yearlyDiscount}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <ul className="space-y-3 mb-8">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button
                      onClick={() => handleSubscribe(tier.key)}
                      className={`w-full ${
                        tier.popular 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : tier.key === 'free'
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                          : 'bg-gray-900 hover:bg-gray-800 text-white'
                      }`}
                      size="lg"
                    >
                      {tier.key === 'free' ? 'Sign Up Free' : 
                       tier.key === 'enterprise' ? 'Contact Sales' : 
                       user ? 'Subscribe Now' : 'Get Started'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Compare All Features
            </h2>
            <p className="text-lg text-gray-600">
              See exactly what's included in each plan
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg shadow-lg">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Features</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-900">Free</th>
                  <th className="text-center py-4 px-6 font-semibold text-blue-600">Premium</th>
                  <th className="text-center py-4 px-6 font-semibold text-purple-600">Pro</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-900">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900">AI Queries</td>
                  <td className="py-4 px-6 text-center text-gray-600">10/month</td>
                  <td className="py-4 px-6 text-center text-blue-600">50/month</td>
                  <td className="py-4 px-6 text-center text-purple-600">500/month</td>
                  <td className="py-4 px-6 text-center text-gray-900">Unlimited</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-4 px-6 font-medium text-gray-900">Document Downloads</td>
                  <td className="py-4 px-6 text-center text-gray-600">1/month</td>
                  <td className="py-4 px-6 text-center text-blue-600">10/month</td>
                  <td className="py-4 px-6 text-center text-purple-600">20/month</td>
                  <td className="py-4 px-6 text-center text-gray-900">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900">Custom Legal Document Downloads</td>
                  <td className="py-4 px-6 text-center text-gray-600">✗</td>
                  <td className="py-4 px-6 text-center text-blue-600">3/month</td>
                  <td className="py-4 px-6 text-center text-purple-600">20/month</td>
                  <td className="py-4 px-6 text-center text-gray-900">Unlimited</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-4 px-6 font-medium text-gray-900">Premium Templates</td>
                  <td className="py-4 px-6 text-center text-green-600">✓</td>
                  <td className="py-4 px-6 text-center text-green-600">✓</td>
                  <td className="py-4 px-6 text-center text-green-600">✓</td>
                  <td className="py-4 px-6 text-center text-green-600">✓</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900">Document Analysis</td>
                  <td className="py-4 px-6 text-center text-green-600">✓</td>
                  <td className="py-4 px-6 text-center text-green-600">✓</td>
                  <td className="py-4 px-6 text-center text-green-600">✓</td>
                  <td className="py-4 px-6 text-center text-green-600">✓</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-4 px-6 font-medium text-gray-900">API Access</td>
                  <td className="py-4 px-6 text-center text-gray-600">✗</td>
                  <td className="py-4 px-6 text-center text-gray-600">✗</td>
                  <td className="py-4 px-6 text-center text-green-600">✓</td>
                  <td className="py-4 px-6 text-center text-green-600">✓</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900">Priority Support</td>
                  <td className="py-4 px-6 text-center text-green-600">✓</td>
                  <td className="py-4 px-6 text-center text-green-600">✓</td>
                  <td className="py-4 px-6 text-center text-green-600">✓</td>
                  <td className="py-4 px-6 text-center text-green-600">✓</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-4 px-6 font-medium text-gray-900">Dedicated Account Manager</td>
                  <td className="py-4 px-6 text-center text-gray-600">✗</td>
                  <td className="py-4 px-6 text-center text-gray-600">✗</td>
                  <td className="py-4 px-6 text-center text-green-600">✓</td>
                  <td className="py-4 px-6 text-center text-green-600">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I change plans later?
              </h3>
              <p className="text-gray-600">
                Yes, you can upgrade, downgrade, or cancel your plan at any time. Changes to your subscription take effect immediately.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How do the monthly limits work?
              </h3>
              <p className="text-gray-600">
                Usage limits reset on the first day of each billing cycle. Unused queries or downloads don't roll over to the next month.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Is my payment information secure?
              </h3>
              <p className="text-gray-600">
                Yes, we use Stripe for all payment processing. Your payment information is never stored on our servers and is protected by bank-level security.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What's your refund policy?
              </h3>
              <p className="text-gray-600">
                If you're not satisfied, contact us within 14 days of your purchase for a full refund. No questions asked.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing;
