import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home, Shield } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  level?: 'page' | 'component' | 'auth';
  showDetails?: boolean;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 ErrorBoundary caught an error:', error, errorInfo);

    // Enhanced auth error detection
    const isAuthError = this.isAuthRelatedError(error, errorInfo);
    if (isAuthError) {
      console.error('🔐 AUTH ERROR DETECTED in ErrorBoundary:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
    }

    this.setState({
      error,
      errorInfo
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to error tracking service if available (but don't let it crash)
    try {
      if (typeof window !== 'undefined' && (window as any).__errorTracker) {
        (window as any).__errorTracker.logError({
          type: 'error',
          message: `React Error Boundary (${this.props.level || 'unknown'}): ${error.message}`,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          level: this.props.level || 'component',
          isAuthError
        });
      }
    } catch (trackingError) {
      console.warn('Error tracking failed:', trackingError);
    }
  }

  // Enhanced auth error detection
  private isAuthRelatedError = (error: Error, errorInfo?: React.ErrorInfo): boolean => {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorStack = error.stack?.toLowerCase() || '';
    const componentStack = errorInfo?.componentStack?.toLowerCase() || '';

    return (
      errorMessage.includes('auth') ||
      errorMessage.includes('supabase') ||
      errorMessage.includes('session') ||
      errorMessage.includes('useauth') ||
      errorMessage.includes('authcontext') ||
      errorStack.includes('authcontext') ||
      componentStack.includes('authcontext') ||
      componentStack.includes('authprovider')
    );
  };

  resetError = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1
      }));
    } else {
      // Max retries reached, redirect to home
      window.location.href = '/';
    }
  };

  // Auth-specific recovery function
  handleAuthRecovery = () => {
    console.log('🔐 ErrorBoundary: Auth recovery initiated');

    // Clear auth storage
    const authKeys = [
      'sb-kvlaydeyqidlfpfutbmp-auth-token',
      'supabase.auth.token',
      'auth-token',
      'user-profile-cache',
      'user-session',
      'auth-state'
    ];

    authKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (e) {
        console.warn('Failed to clear auth key during recovery:', key);
      }
    });

    // Redirect to login
    window.location.href = '/auth/login';
  };

  getErrorMessage = () => {
    const { error, errorInfo } = this.state;
    const { level } = this.props;
    const isAuthError = this.isAuthRelatedError(error || new Error(), errorInfo);

    // Enhanced auth error detection
    if (isAuthError || level === 'auth') {
      if (error?.message?.includes('AuthSessionMissingError') || error?.message?.includes('session missing')) {
        return {
          title: 'Authentication Session Expired',
          description: 'Your authentication session has expired or is missing. Please sign in again.',
          suggestion: 'Clear your browser data and sign in again if the problem persists.',
          isAuthError: true
        };
      }

      if (error?.message?.includes('supabase is not defined')) {
        return {
          title: 'Authentication Service Error',
          description: 'The authentication service failed to initialize properly.',
          suggestion: 'This is usually a temporary issue. Try refreshing the page.',
          isAuthError: true
        };
      }

      return {
        title: 'Authentication Service Unavailable',
        description: 'The authentication system is temporarily unavailable. You can still browse the site as a guest.',
        suggestion: 'Try refreshing the page or continue without signing in.',
        isAuthError: true
      };
    }

    if (error?.message?.includes('createContext')) {
      return {
        title: 'Component Loading Error',
        description: 'A component failed to load properly. This might be a temporary issue.',
        suggestion: 'Please try refreshing the page.',
        isAuthError: false
      };
    }

    return {
      title: 'Something went wrong',
      description: 'We encountered an unexpected error. Please try refreshing the page or go back to the homepage.',
      suggestion: 'If the problem persists, please contact support.',
      isAuthError: false
    };
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.getErrorMessage();

      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error || new Error('Unknown error')} resetError={this.resetError} />;
      }

      // Component-level error (smaller, inline)
      if (this.props.level === 'component') {
        return (
          <Alert className="my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage.description}
              <Button
                onClick={this.resetError}
                variant="outline"
                size="sm"
                className="ml-2"
                disabled={this.state.retryCount >= this.maxRetries}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                {this.state.retryCount >= this.maxRetries ? 'Max retries reached' : 'Retry'}
              </Button>
            </AlertDescription>
          </Alert>
        );
      }

      // Auth-level error (show auth recovery options)
      if (this.props.level === 'auth' || errorMessage.isAuthError) {
        return (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 my-4">
            <div className="flex items-start">
              <Shield className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  {errorMessage.title}
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  {errorMessage.description}
                </p>
                <div className="mt-3 flex space-x-2 flex-wrap gap-2">
                  <Button
                    onClick={this.handleAuthRecovery}
                    variant="outline"
                    size="sm"
                    className="bg-white"
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    Clear Auth & Sign In
                  </Button>
                  <Button
                    onClick={this.resetError}
                    variant="outline"
                    size="sm"
                    disabled={this.state.retryCount >= this.maxRetries}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {this.state.retryCount >= this.maxRetries ? 'Max retries' : 'Retry'}
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/'}
                    variant="outline"
                    size="sm"
                  >
                    Continue as Guest
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Page-level error (full screen)
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                {errorMessage.title}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {errorMessage.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(this.props.showDetails || process.env.NODE_ENV === 'development') && this.state.error && (
                <div className="rounded-md bg-red-50 p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Error Details:</h4>
                  <p className="text-xs text-red-700 font-mono break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-700 cursor-pointer">Stack Trace</summary>
                      <pre className="text-xs text-red-700 mt-1 whitespace-pre-wrap break-all">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
              <div className="flex space-x-3">
                <Button
                  onClick={this.resetError}
                  className="flex-1"
                  variant="outline"
                  disabled={this.state.retryCount >= this.maxRetries}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {this.state.retryCount >= this.maxRetries ? 'Max Retries' : `Try Again (${this.maxRetries - this.state.retryCount} left)`}
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                  className="flex-1"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                {errorMessage.suggestion}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
