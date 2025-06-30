import React, { useState } from 'react';
import { useSafeAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const SignOutTest: React.FC = () => {
  const { user, profile, session, loading, signOut, signIn } = useSafeAuth();
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
  }>>([]);
  const [isRunningTest, setIsRunningTest] = useState(false);

  const runAuthStateTest = () => {
    const results = [];

    // Test 1: Check if page starts signed out
    if (!user && !session && !loading) {
      results.push({
        test: 'Initial State',
        status: 'pass' as const,
        message: 'Page correctly starts in signed-out state'
      });
    } else if (loading) {
      results.push({
        test: 'Initial State',
        status: 'warning' as const,
        message: 'Page is still loading authentication state'
      });
    } else {
      results.push({
        test: 'Initial State',
        status: 'fail' as const,
        message: `Page started with user session: ${user?.email || 'unknown'}`
      });
    }

    // Test 2: Check storage is clean
    const authKeys = [
      'sb-kvlaydeyqidlfpfutbmp-auth-token',
      'user-profile-cache',
      'supabase.auth.token'
    ];
    
    const foundKeys = authKeys.filter(key => 
      localStorage.getItem(key) || sessionStorage.getItem(key)
    );

    if (foundKeys.length === 0) {
      results.push({
        test: 'Storage Clean',
        status: 'pass' as const,
        message: 'No authentication data found in storage'
      });
    } else {
      results.push({
        test: 'Storage Clean',
        status: 'fail' as const,
        message: `Found auth data in storage: ${foundKeys.join(', ')}`
      });
    }

    setTestResults(results);
  };

  const testSignOut = async () => {
    if (!user) {
      alert('Please sign in first to test sign out functionality');
      return;
    }

    setIsRunningTest(true);
    console.log('🧪 Testing sign out functionality...');

    try {
      // Record state before sign out
      const beforeState = {
        hasUser: !!user,
        hasSession: !!session,
        userEmail: user?.email
      };

      console.log('🧪 State before sign out:', beforeState);

      // Perform sign out
      await signOut();

      // Note: The signOut function should redirect, so this code might not execute
      console.log('🧪 Sign out completed - checking if redirect happened...');
      
      setTimeout(() => {
        if (window.location.pathname === '/') {
          console.log('✅ Sign out successful - redirected to homepage');
        } else {
          console.log('⚠️ Sign out may not have redirected properly');
        }
        setIsRunningTest(false);
      }, 1000);

    } catch (error) {
      console.error('🧪 Sign out test failed:', error);
      setIsRunningTest(false);
      alert(`Sign out test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testSignIn = async () => {
    try {
      // For testing purposes, we'll just redirect to login page
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Sign in test failed:', error);
      alert(`Sign in test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const clearAllStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log('✅ All storage cleared');
      window.location.reload();
    } catch (error) {
      console.error('Storage clear failed:', error);
    }
  };

  React.useEffect(() => {
    // Run initial test when component mounts
    runAuthStateTest();
  }, [user, session, loading]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sign Out Functionality Test</CardTitle>
            <CardDescription>
              Test the authentication sign-out functionality and verify clean state
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Auth State */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium mb-3">Current Authentication State:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <strong>User:</strong> {user?.email || 'Not signed in'}
                </div>
                <div>
                  <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong>Profile:</strong> {profile?.role || 'None'}
                </div>
              </div>
            </div>

            {/* Test Results */}
            <div>
              <h3 className="font-medium mb-3">Automated Test Results:</h3>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <Alert key={index} className={`
                    ${result.status === 'pass' ? 'border-green-200 bg-green-50' : ''}
                    ${result.status === 'fail' ? 'border-red-200 bg-red-50' : ''}
                    ${result.status === 'warning' ? 'border-yellow-200 bg-yellow-50' : ''}
                  `}>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(result.status)}
                      <AlertDescription>
                        <strong>{result.test}:</strong> {result.message}
                      </AlertDescription>
                    </div>
                  </Alert>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button 
                onClick={runAuthStateTest}
                variant="outline"
                className="w-full"
              >
                Re-run Tests
              </Button>

              {user ? (
                <Button 
                  onClick={testSignOut}
                  disabled={isRunningTest}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  {isRunningTest ? 'Testing...' : 'Test Sign Out'}
                </Button>
              ) : (
                <Button 
                  onClick={testSignIn}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Test Sign In
                </Button>
              )}

              <Button 
                onClick={clearAllStorage}
                variant="destructive"
                className="w-full"
              >
                Clear All Storage
              </Button>

              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="w-full"
              >
                Go to Homepage
              </Button>
            </div>

            {/* Instructions */}
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-medium mb-2">Test Instructions:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Check that the page starts in a signed-out state (all tests should pass)</li>
                <li>Click "Test Sign In" to go to login page and sign in</li>
                <li>Return to this page and click "Test Sign Out" to verify sign out works</li>
                <li>Verify that after sign out, you're redirected to homepage in signed-out state</li>
                <li>Use "Clear All Storage" if you need to reset everything</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignOutTest;
