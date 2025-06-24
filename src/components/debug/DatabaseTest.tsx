import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  details?: any;
}

const DatabaseTest: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const testResults: TestResult[] = [];

    // Test 1: Supabase Connection
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      testResults.push({
        name: 'Supabase Connection',
        status: error ? 'error' : 'success',
        message: error ? error.message : 'Connected successfully',
        details: { data, error }
      });
    } catch (error) {
      testResults.push({
        name: 'Supabase Connection',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      });
    }

    // Test 2: uploaded_documents table
    try {
      const { data, error } = await supabase
        .from('uploaded_documents')
        .select('id, filename, processing_status')
        .limit(5);
      
      testResults.push({
        name: 'uploaded_documents Table',
        status: error ? 'error' : 'success',
        message: error ? error.message : `Found ${data?.length || 0} documents`,
        details: { data, error }
      });
    } catch (error) {
      testResults.push({
        name: 'uploaded_documents Table',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      });
    }

    // Test 3: Authentication
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      testResults.push({
        name: 'Authentication',
        status: error ? 'error' : 'success',
        message: error ? error.message : user ? `Logged in as ${user.email}` : 'Not logged in',
        details: { user, error }
      });
    } catch (error) {
      testResults.push({
        name: 'Authentication',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      });
    }

    // Test 4: Storage bucket
    try {
      const { data, error } = await supabase.storage.listBuckets();
      const documentsBucket = data?.find(bucket => bucket.name === 'documents');
      testResults.push({
        name: 'Storage Bucket',
        status: error ? 'error' : documentsBucket ? 'success' : 'error',
        message: error ? error.message : documentsBucket ? 'Documents bucket exists' : 'Documents bucket not found',
        details: { buckets: data, error }
      });
    } catch (error) {
      testResults.push({
        name: 'Storage Bucket',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      });
    }

    // Test 5: Environment Variables
    const envVars = {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? '***' : undefined,
      VITE_APP_URL: import.meta.env.VITE_APP_URL,
    };

    const missingVars = Object.entries(envVars).filter(([key, value]) => !value);
    testResults.push({
      name: 'Environment Variables',
      status: missingVars.length > 0 ? 'error' : 'success',
      message: missingVars.length > 0 ? `Missing: ${missingVars.map(([key]) => key).join(', ')}` : 'All required variables present',
      details: envVars
    });

    setTests(testResults);
    setIsRunning(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Database Connection Test
          <Button onClick={runTests} disabled={isRunning} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running...' : 'Run Tests'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tests.map((test, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
              {getStatusIcon(test.status)}
              <div className="flex-1">
                <h4 className="font-medium">{test.name}</h4>
                <p className="text-sm text-gray-600">{test.message}</p>
                {process.env.NODE_ENV === 'development' && test.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer">Details</summary>
                    <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(test.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DatabaseTest;
