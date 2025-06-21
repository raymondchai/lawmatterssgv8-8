import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { sessionSecurityService } from '@/lib/services/sessionSecurity';
import { TwoFactorVerification } from './TwoFactorVerification';
import { ROUTES } from '@/lib/config/constants';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    attemptsRemaining: number;
    resetTime?: Date;
    isBlocked: boolean;
  } | null>(null);
  const { signIn, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();

  // Check rate limit status on component mount
  useEffect(() => {
    const checkRateLimit = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        const rateLimit = await sessionSecurityService.checkRateLimit(data.ip);

        setRateLimitInfo({
          attemptsRemaining: rateLimit.attemptsRemaining,
          resetTime: rateLimit.resetTime,
          isBlocked: !rateLimit.allowed
        });
      } catch (error) {
        console.error('Error checking rate limit:', error);
      }
    };

    checkRateLimit();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn(data.email, data.password);

      if (result.requiresTwoFactor) {
        setUserEmail(data.email);
        setShowTwoFactor(true);
      } else {
        navigate(ROUTES.dashboard);
      }
    } catch (err: any) {
      setError(err.message ?? 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorSuccess = () => {
    setShowTwoFactor(false);
    navigate(ROUTES.dashboard);
  };

  const handleTwoFactorBack = () => {
    setShowTwoFactor(false);
    setUserEmail('');
  };

  if (showTwoFactor) {
    return (
      <TwoFactorVerification
        onVerificationSuccess={handleTwoFactorSuccess}
        onBack={handleTwoFactorBack}
        userEmail={userEmail}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign in</CardTitle>
          <CardDescription className="text-center">
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {rateLimitInfo?.isBlocked && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Too many failed login attempts. Please try again {rateLimitInfo.resetTime?.toLocaleTimeString()}.
                </AlertDescription>
              </Alert>
            )}

            {rateLimitInfo && !rateLimitInfo.isBlocked && rateLimitInfo.attemptsRemaining < 3 && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  {rateLimitInfo.attemptsRemaining} login attempts remaining before temporary lockout.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  {...register('password')}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Link
                to={ROUTES.forgotPassword}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Forgot your password?
              </Link>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || rateLimitInfo?.isBlocked}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {rateLimitInfo?.isBlocked ? 'Account Temporarily Locked' : 'Sign in'}
            </Button>
            
            <p className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                to={ROUTES.register}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
