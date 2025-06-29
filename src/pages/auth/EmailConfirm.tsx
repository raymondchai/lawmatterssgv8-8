import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ROUTES } from '@/lib/config/constants';

const EmailConfirm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        if (!token_hash || type !== 'email') {
          setStatus('error');
          setMessage('Invalid confirmation link. Please check your email and try again.');
          return;
        }

        // Verify the email confirmation token
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'email'
        });

        if (error) {
          console.error('Email confirmation error:', error);
          setStatus('error');
          
          if (error.message.includes('expired')) {
            setMessage('This confirmation link has expired. Please request a new verification email.');
          } else if (error.message.includes('invalid')) {
            setMessage('This confirmation link is invalid. Please check your email and try again.');
          } else {
            setMessage(error.message || 'Failed to confirm email. Please try again.');
          }
          return;
        }

        if (data.user) {
          setStatus('success');
          setMessage('Your email has been verified successfully! You can now sign in to your account.');
          
          // Redirect to login after a short delay
          setTimeout(() => {
            navigate(ROUTES.login, { 
              state: { message: 'Email verified successfully! You can now sign in.' }
            });
          }, 3000);
        } else {
          setStatus('error');
          setMessage('Email confirmation failed. Please try again.');
        }
      } catch (error: any) {
        console.error('Email confirmation error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full mb-4">
            {status === 'loading' && (
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            )}
            {status === 'error' && (
              <div className="bg-red-100 rounded-full w-12 h-12 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            )}
          </div>
          
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && 'Confirming Email...'}
            {status === 'success' && 'Email Confirmed!'}
            {status === 'error' && 'Confirmation Failed'}
          </CardTitle>
          
          <CardDescription>
            {status === 'loading' && 'Please wait while we verify your email address.'}
            {status === 'success' && 'Your account is now active and ready to use.'}
            {status === 'error' && 'There was a problem confirming your email address.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert className={
            status === 'success' ? 'border-green-200 bg-green-50' :
            status === 'error' ? 'border-red-200 bg-red-50' :
            'border-blue-200 bg-blue-50'
          }>
            <AlertDescription className={
              status === 'success' ? 'text-green-800' :
              status === 'error' ? 'text-red-800' :
              'text-blue-800'
            }>
              {message}
            </AlertDescription>
          </Alert>

          {status === 'success' && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Redirecting to sign in page in a few seconds...
              </p>
              <Button
                onClick={() => navigate(ROUTES.login)}
                className="w-full"
              >
                Sign In Now
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-2">
              <Button
                onClick={() => navigate(ROUTES.register)}
                className="w-full"
              >
                Request New Verification Email
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(ROUTES.login)}
                className="w-full"
              >
                Back to Sign In
              </Button>
            </div>
          )}

          {status === 'loading' && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => navigate(ROUTES.home)}
                className="w-full"
              >
                Back to Home
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailConfirm;
