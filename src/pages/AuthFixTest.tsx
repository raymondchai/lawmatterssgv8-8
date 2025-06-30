import React, { useEffect, useState } from 'react';
import { useSafeAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

const AuthFixTest: React.FC = () => {
  const { user, profile, session, loading, signOut } = useSafeAuth();
  const [loadingTimer, setLoadingTimer] = useState(0);
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
  }>>([]);

  // Track loading time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingTimer(prev => prev + 0.1);
      }, 100);
    } else {
      setLoadingTimer(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  // Run tests when auth state changes
  useEffect(() => {
    const results = [];

    // Test 1: Loading timeout
    if (loading && loadingTimer > 5) {
      results.push({
        test: 'Loading Timeout',
        status: 'fail' as const,
        message: `Loading state stuck for ${loadingTimer.toFixed(1)}s - should clear within 5s`
      });
    } else if (!loading) {
      results.push({
        test: 'Loading Timeout',
        status: 'pass' as const,
        message: `Loading cleared properly (${loadingTimer.toFixed(1)}s)`
      });
    }

    // Test 2: Auth state consistency
    if (!loading) {
      if (user && session && profile) {
        results.push({
          test: 'Auth State Consistency',
          status: 'pass' as const,
          message: 'User, session, and profile all present'
        });
      } else if (!user && !session && !profile) {
        results.push({
          test: 'Auth State Consistency',
          status: 'pass' as const,
          message: 'All auth states properly cleared'
        });
      } else {
        results.push({
          test: 'Auth State Consistency',
          status: 'warning' as const,
          message: `Inconsistent state: user=${!!user}, session=${!!session}, profile=${!!profile}`
        });
      }
    }

    // Test 3: Profile role
    if (profile) {
      if (profile.role && profile.role !== 'user') {
        results.push({
          test: 'Profile Role',
          status: 'pass' as const,
          message: `Role properly loaded: ${profile.role}`
        });
      } else {
        results.push({
          test: 'Profile Role',
          status: 'warning' as const,
          message: `Default role detected: ${profile.role || 'undefined'}`
        });
      }
    }

    setTestResults(results);
  }, [loading, loadingTimer, user, session, profile]);

  const handleSignOut = async () => {
    try {
      console.log('Testing sign out...');
      await signOut();
    } catch (error) {
      console.error('Sign out test failed:', error);
    }
  };

  const handleEmergencyLoadingClear = () => {
    if (typeof window !== 'undefined' && (window as any).emergencyLoadingClear) {
      (window as any).emergencyLoadingClear();
    } else {
      console.error('Emergency loading clear function not available');
    }
  };

  const handleEmergencyLogout = () => {
    if (typeof window !== 'undefined' && (window as any).emergencyLogout) {
      (window as any).emergencyLogout();
    } else {
      console.error('Emergency logout function not available');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-100 text-green-800';
      case 'fail': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>🔧 Authentication Fix Test</span>
              {loading && <Clock className="h-5 w-5 animate-spin text-blue-500" />}
            </CardTitle>
            <CardDescription>
              Testing the authentication fixes for infinite loading and sign-out issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Loading Status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Loading State:</span>
              <div className="flex items-center space-x-2">
                <Badge className={loading ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                  {loading ? `Loading (${loadingTimer.toFixed(1)}s)` : 'Ready'}
                </Badge>
                {loading && loadingTimer > 3 && (
                  <Button size="sm" variant="outline" onClick={handleEmergencyLoadingClear}>
                    Emergency Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Auth State */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-sm text-gray-600">User</div>
                <div className="text-sm">{user ? user.email : 'Not signed in'}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-sm text-gray-600">Session</div>
                <div className="text-sm">{session ? 'Active' : 'None'}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-sm text-gray-600">Profile</div>
                <div className="text-sm">{profile ? `${profile.role || 'user'}` : 'None'}</div>
              </div>
            </div>

            {/* Test Results */}
            <div className="space-y-2">
              <h3 className="font-medium">Test Results:</h3>
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.test}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{result.message}</span>
                    <Badge className={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              {user && (
                <Button onClick={handleSignOut} variant="outline">
                  Test Sign Out
                </Button>
              )}
              <Button onClick={handleEmergencyLoadingClear} variant="outline" size="sm">
                Emergency Loading Clear
              </Button>
              <Button onClick={handleEmergencyLogout} variant="outline" size="sm">
                Emergency Logout
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Console Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>🛠️ Emergency Console Commands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm font-mono bg-gray-100 p-3 rounded">
              <div>window.emergencyLoadingClear() - Clear stuck loading state</div>
              <div>window.emergencyLogout() - Force complete logout</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthFixTest;
