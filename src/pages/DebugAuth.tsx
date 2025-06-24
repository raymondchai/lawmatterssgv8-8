import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { documentsApi } from '@/lib/api/documents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

const DebugAuth: React.FC = () => {
  const { user, loading, profile } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    // Test 1: Authentication Status
    results.push({
      name: 'Authentication Status',
      status: user ? 'success' : 'error',
      message: user ? `Authenticated as ${user.email}` : 'Not authenticated',
      details: { user: user ? { id: user.id, email: user.email } : null }
    });

    // Test 2: Profile Loading
    results.push({
      name: 'Profile Loading',
      status: profile ? 'success' : 'warning',
      message: profile ? `Profile loaded: ${profile.email}` : 'No profile loaded',
      details: profile
    });

    // Test 3: Supabase Connection
    try {
      const { data, error } = await supabase.auth.getUser();
      results.push({
        name: 'Supabase Connection',
        status: error ? 'error' : 'success',
        message: error ? `Connection error: ${error.message}` : 'Connected successfully',
        details: { data, error }
      });
    } catch (error) {
      results.push({
        name: 'Supabase Connection',
        status: 'error',
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }

    // Test 4: Documents API
    try {
      const documents = await documentsApi.getDocuments();
      results.push({
        name: 'Documents API',
        status: 'success',
        message: `Successfully loaded ${documents.length} documents`,
        details: documents
      });
    } catch (error) {
      results.push({
        name: 'Documents API',
        status: 'error',
        message: `Failed to load documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }

    // Test 5: Database Query Test
    try {
      const { data, error } = await supabase
        .from('uploaded_documents')
        .select('count(*)')
        .limit(1);
      
      results.push({
        name: 'Database Query',
        status: error ? 'error' : 'success',
        message: error ? `Query failed: ${error.message}` : 'Database query successful',
        details: { data, error }
      });
    } catch (error) {
      results.push({
        name: 'Database Query',
        status: 'error',
        message: `Query error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }

    setTestResults(results);
    setIsRunning(false);
  };

  useEffect(() => {
    if (!loading) {
      runTests();
    }
  }, [loading]);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-4">Authentication Debug</h1>
          <p className="text-gray-600 text-center">
            Debugging authentication and document loading issues
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Debug Tests
              <Button onClick={runTests} disabled={isRunning} size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
                {isRunning ? 'Running...' : 'Run Tests'}
              </Button>
            </CardTitle>
            <CardDescription>
              Testing authentication, database connection, and API functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(result.status)}
                      <h3 className="font-medium">{result.name}</h3>
                    </div>
                    <Badge className={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                  {result.details && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                        Show details
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Supabase URL:</strong>
                <p className="text-gray-600">{import.meta.env.VITE_SUPABASE_URL}</p>
              </div>
              <div>
                <strong>Environment:</strong>
                <p className="text-gray-600">{import.meta.env.MODE}</p>
              </div>
              <div>
                <strong>User Agent:</strong>
                <p className="text-gray-600 break-all">{navigator.userAgent}</p>
              </div>
              <div>
                <strong>Current URL:</strong>
                <p className="text-gray-600 break-all">{window.location.href}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DebugAuth;
