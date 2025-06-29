import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

interface EmailVerificationPromptProps {
  email: string;
  onBack?: () => void;
}

export const EmailVerificationPrompt: React.FC<EmailVerificationPromptProps> = ({
  email,
  onBack
}) => {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const { resendVerificationEmail } = useAuth();

  const handleResendEmail = async () => {
    setIsResending(true);
    setResendSuccess(false);

    try {
      await resendVerificationEmail(email);
      setResendSuccess(true);
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      toast.error(error.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
          <CardDescription>
            We've sent a verification link to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You must verify your email address before you can sign in to your account.
            </AlertDescription>
          </Alert>

          {resendSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Verification email sent successfully! Please check your inbox and spam folder.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              Click the verification link in your email to activate your account.
            </p>
            
            <div className="text-center">
              <Button
                variant="outline"
                onClick={handleResendEmail}
                disabled={isResending}
                className="w-full"
              >
                {isResending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
            </div>

            {onBack && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="w-full"
              >
                Back to Sign In
              </Button>
            )}
          </div>

          <div className="text-xs text-gray-500 text-center space-y-2">
            <p>
              <strong>Didn't receive the email?</strong>
            </p>
            <ul className="space-y-1">
              <li>• Check your spam/junk folder</li>
              <li>• Make sure {email} is correct</li>
              <li>• Try resending the verification email</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
