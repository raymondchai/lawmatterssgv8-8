import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { XCircle, ArrowLeft, CreditCard, HelpCircle, RefreshCw } from 'lucide-react';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';

const PaymentFailure = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const handleRetryPayment = () => {
    navigate('/pricing');
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@lawmatterssg.com?subject=Payment Issue';
  };

  const getErrorMessage = () => {
    switch (error) {
      case 'payment_failed':
        return 'Your payment could not be processed. Please check your payment details and try again.';
      case 'card_declined':
        return 'Your card was declined. Please try a different payment method or contact your bank.';
      case 'insufficient_funds':
        return 'Your card has insufficient funds. Please try a different payment method.';
      case 'expired_card':
        return 'Your card has expired. Please update your payment method and try again.';
      case 'processing_error':
        return 'There was an error processing your payment. Please try again in a few minutes.';
      default:
        return errorDescription || 'We encountered an issue processing your payment. Please try again.';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Payment Failed
          </h1>
          
          <p className="text-xl text-gray-600 mb-8">
            We couldn't process your payment. Don't worry, no charges were made to your account.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Error Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <XCircle className="h-5 w-5 mr-2" />
                What Happened?
              </CardTitle>
              <CardDescription>
                Details about the payment issue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertDescription>
                  {getErrorMessage()}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <RefreshCw className="h-5 w-5 mr-2" />
                What Can You Do?
              </CardTitle>
              <CardDescription>
                Steps to resolve the issue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-blue-600">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Check Your Payment Method</p>
                    <p className="text-xs text-gray-600">Ensure your card details are correct and up to date</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-blue-600">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Try Again</p>
                    <p className="text-xs text-gray-600">Return to pricing and attempt the payment again</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-blue-600">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Contact Support</p>
                    <p className="text-xs text-gray-600">If the issue persists, our team is here to help</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button onClick={handleRetryPayment} size="lg" className="flex items-center">
            <CreditCard className="h-4 w-4 mr-2" />
            Try Payment Again
          </Button>
          
          <Button variant="outline" onClick={handleContactSupport} size="lg">
            <HelpCircle className="h-4 w-4 mr-2" />
            Contact Support
          </Button>
          
          <Button variant="ghost" onClick={handleBackToDashboard} size="lg">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Common Issues */}
        <Card>
          <CardHeader>
            <CardTitle>Common Payment Issues</CardTitle>
            <CardDescription>
              Here are some common reasons why payments fail and how to fix them
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Card Issues</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Expired or invalid card</li>
                  <li>• Insufficient funds</li>
                  <li>• Card blocked by bank</li>
                  <li>• Incorrect card details</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Technical Issues</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Network connectivity problems</li>
                  <li>• Browser compatibility issues</li>
                  <li>• Temporary payment processor issues</li>
                  <li>• Security verification required</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support Information */}
        <div className="mt-8 p-6 bg-gray-50 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Need Help?
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Our support team is available to help you resolve any payment issues.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center text-sm text-gray-600">
            <span>Email: support@lawmatterssg.com</span>
            <span className="hidden sm:inline">•</span>
            <span>Response time: Within 24 hours</span>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PaymentFailure;
