import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useSafeAuth } from '@/contexts/AuthContext';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  duration?: number;
}

export const AuthFlowTest: React.FC = () => {
  const { user, profile, session, loading, signIn, signOut } = useSafeAuth();
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testEmail] = useState('raymond.chai@8atoms.com');
  const [testPassword] = useState('test123'); // This should be replaced with actual test credentials

  const updateTest = (name: string, status: TestResult['status'], message: string, duration?: number) => {
    setTests(prev => prev.map(test => 
      test.name === name ? { ...test, status, message, duration } : test
    ));
  };

  const addTest = (name: string) => {
    setTests(prev => [...prev, { name, status: 'pending', message: 'Starting...' }]);
  };

  const runAuthFlowTests = async () => {
    setIsRunning(true);
    setTests([]);

    try {
      // Test 1: Auth Context Initialization
      addTest('Auth Context Initialization');
      const startTime = Date.now();
      
      // Wait for auth to initialize
      let attempts = 0;
      while (loading && attempts < 30) { // 3 second timeout
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (loading) {
        updateTest('Auth Context Initialization', 'error', 'Auth initialization timed out after 3 seconds');
      } else {
        updateTest('Auth Context Initialization', 'success', 'Auth context initialized successfully', Date.now() - startTime);
      }

      // Test 2: Session State Check
      addTest('Session State Check');
      const sessionStartTime = Date.now();
      
      if (session) {
        updateTest('Session State Check', 'success', `Valid session found for ${session.user?.email}`, Date.now() - sessionStartTime);
      } else {
        updateTest('Session State Check', 'success', 'No active session (expected for signed out state)', Date.now() - sessionStartTime);
      }

      // Test 3: Profile Loading
      addTest('Profile Loading');
      const profileStartTime = Date.now();
      
      if (profile) {
        updateTest('Profile Loading', 'success', `Profile loaded: ${profile.role} (${profile.email})`, Date.now() - profileStartTime);
      } else if (!session) {
        updateTest('Profile Loading', 'success', 'No profile (no active session)', Date.now() - profileStartTime);
      } else {
        updateTest('Profile Loading', 'error', 'Session exists but no profile loaded');
      }

      // Test 4: Sign Out Flow (if signed in)
      if (session && user) {
        addTest('Sign Out Flow');
        const signOutStartTime = Date.now();
        
        try {
          await signOut();
          
          // Wait for sign out to complete
          let signOutAttempts = 0;
          while ((session || loading) && signOutAttempts < 50) { // 5 second timeout
            await new Promise(resolve => setTimeout(resolve, 100));
            signOutAttempts++;
          }
          
          if (!session && !loading) {
            updateTest('Sign Out Flow', 'success', 'Sign out completed successfully', Date.now() - signOutStartTime);
          } else if (loading) {
            updateTest('Sign Out Flow', 'error', 'Sign out stuck in loading state');
          } else {
            updateTest('Sign Out Flow', 'error', 'Session not cleared after sign out');
          }
        } catch (error) {
          updateTest('Sign Out Flow', 'error', `Sign out failed: ${error}`);
        }
      }

      // Test 5: Error Handling
      addTest('Error Handling');
      const errorStartTime = Date.now();
      
      try {
        // Test with invalid credentials to check error handling
        await signIn('invalid@email.com', 'wrongpassword');
        updateTest('Error Handling', 'error', 'Should have failed with invalid credentials');
      } catch (error) {
        updateTest('Error Handling', 'success', `Error handling works: ${error}`, Date.now() - errorStartTime);
      }

    } catch (error) {
      console.error('Test suite error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'pending':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Authentication Flow Test Suite
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Auth State */}
        <Alert>
          <AlertDescription>
            <strong>Current State:</strong> {loading ? 'Loading...' : 
              user ? `Signed in as ${user.email} (${profile?.role || 'no profile'})` : 'Signed out'}
          </AlertDescription>
        </Alert>

        {/* Test Controls */}
        <div className="flex gap-2">
          <Button 
            onClick={runAuthFlowTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? <Clock className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {isRunning ? 'Running Tests...' : 'Run Auth Flow Tests'}
          </Button>
        </div>

        {/* Test Results */}
        {tests.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Test Results:</h3>
            {tests.map((test, index) => (
              <div key={index} className={`p-3 rounded-lg border ${getStatusColor(test.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(test.status)}
                    <span className="font-medium">{test.name}</span>
                  </div>
                  {test.duration && (
                    <span className="text-sm opacity-75">{test.duration}ms</span>
                  )}
                </div>
                <p className="text-sm mt-1 ml-6">{test.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Test Summary */}
        {tests.length > 0 && !isRunning && (
          <Alert>
            <AlertDescription>
              <strong>Summary:</strong> {tests.filter(t => t.status === 'success').length} passed, {' '}
              {tests.filter(t => t.status === 'error').length} failed, {' '}
              {tests.filter(t => t.status === 'pending').length} pending
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
