import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';

interface AuthErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * Specialized error boundary for authentication-related components
 * Provides graceful fallback when auth context is unavailable
 */
export const AuthErrorBoundary: React.FC<AuthErrorBoundaryProps> = ({ children }) => {
  const handleAuthError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.warn('Authentication error caught:', error.message);
    
    // Log specific auth errors for debugging
    if (error.message.includes('useAuth must be used within an AuthProvider')) {
      console.warn('Component tried to use auth context without provider - providing fallback');
    }
  };

  return (
    <ErrorBoundary 
      level="auth" 
      onError={handleAuthError}
    >
      {children}
    </ErrorBoundary>
  );
};

export default AuthErrorBoundary;
