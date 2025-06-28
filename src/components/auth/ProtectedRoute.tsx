import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSafeAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/lib/config/constants';
import { Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthErrorBoundary from './AuthErrorBoundary';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  fallbackToGuest?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  redirectTo = ROUTES.login,
  fallbackToGuest = false,
}) => {
  const { user, loading, session } = useSafeAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  // Be more patient with loading to prevent premature redirects
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-gray-600">Checking authentication...</p>
          <p className="text-xs text-gray-500">Please wait while we verify your session</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !user) {
    // If fallbackToGuest is enabled, show guest experience instead of redirecting
    if (fallbackToGuest) {
      return (
        <AuthErrorBoundary>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="mb-4">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Authentication Required
              </h2>
              <p className="text-gray-600 mb-6">
                This page requires you to be signed in. Please log in to continue.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => window.location.href = ROUTES.login}
                  className="w-full"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => window.location.href = ROUTES.home}
                  variant="outline"
                  className="w-full"
                >
                  Back to Home
                </Button>
              </div>
            </div>
          </div>
        </AuthErrorBoundary>
      );
    }

    // Save the attempted location for redirecting after login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If authentication is not required but user is authenticated (e.g., login page)
  // Only redirect if we have both a valid user AND a valid session
  if (!requireAuth && user && session) {
    // Redirect to dashboard if user is already logged in
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return (
    <AuthErrorBoundary>
      {children}
    </AuthErrorBoundary>
  );
};

// Convenience component for routes that require authentication
export const AuthenticatedRoute: React.FC<{
  children: React.ReactNode;
  fallbackToGuest?: boolean;
}> = ({ children, fallbackToGuest = true }) => (
  <ProtectedRoute requireAuth={true} fallbackToGuest={fallbackToGuest}>
    {children}
  </ProtectedRoute>
);

// Convenience component for routes that should only be accessible to unauthenticated users
export const UnauthenticatedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requireAuth={false}>{children}</ProtectedRoute>
);

// Convenience component for routes that work with or without authentication
export const OptionalAuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthErrorBoundary>
    {children}
  </AuthErrorBoundary>
);
