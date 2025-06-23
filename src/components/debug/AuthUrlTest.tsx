import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { debugUrlConfig, getAppUrl, getAuthRedirectUrls, getSupabaseSiteUrl } from '@/lib/utils/url';
import { authConfig } from '@/lib/auth/config';
import { supabase } from '@/lib/supabase';

interface UrlTestResult {
  name: string;
  expected: string;
  actual: string;
  status: 'pass' | 'fail' | 'warning';
  description: string;
}

export const AuthUrlTest: React.FC = () => {
  const [testResults, setTestResults] = useState<UrlTestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [supabaseConfig, setSupabaseConfig] = useState<any>(null);

  const runTests = async () => {
    setLoading(true);
    const results: UrlTestResult[] = [];

    try {
      // Test 1: App URL
      const appUrl = getAppUrl();
      results.push({
        name: 'App URL',
        expected: 'http://localhost:8082',
        actual: appUrl,
        status: appUrl === 'http://localhost:8082' ? 'pass' : 'fail',
        description: 'Application base URL should match development server'
      });

      // Test 2: Supabase Site URL
      const siteUrl = getSupabaseSiteUrl();
      results.push({
        name: 'Supabase Site URL',
        expected: 'http://localhost:8082',
        actual: siteUrl,
        status: siteUrl === 'http://localhost:8082' ? 'pass' : 'fail',
        description: 'Supabase site URL should match app URL'
      });

      // Test 3: Auth Redirect URLs
      const redirectUrls = getAuthRedirectUrls();
      const hasCorrectRedirect = redirectUrls.includes('http://localhost:8082');
      results.push({
        name: 'Auth Redirect URLs',
        expected: 'Contains http://localhost:8082',
        actual: redirectUrls.join(', '),
        status: hasCorrectRedirect ? 'pass' : 'fail',
        description: 'Redirect URLs should include the development server URL'
      });

      // Test 4: Environment Variables
      const envAppUrl = import.meta.env.VITE_APP_URL;
      results.push({
        name: 'Environment VITE_APP_URL',
        expected: 'http://localhost:8082',
        actual: envAppUrl || 'undefined',
        status: envAppUrl === 'http://localhost:8082' ? 'pass' : 'warning',
        description: 'Environment variable should match development server'
      });

      // Test 5: Window Location (if available)
      if (typeof window !== 'undefined') {
        const windowOrigin = window.location.origin;
        results.push({
          name: 'Window Origin',
          expected: 'http://localhost:8082',
          actual: windowOrigin,
          status: windowOrigin === 'http://localhost:8082' ? 'pass' : 'warning',
          description: 'Browser window origin should match expected URL'
        });
      }

      // Test 6: Auth Config Options
      const signInOptions = authConfig.getSignInOptions();
      const expectedRedirect = 'http://localhost:8082/dashboard';
      results.push({
        name: 'Sign-in Redirect',
        expected: expectedRedirect,
        actual: signInOptions.redirectTo,
        status: signInOptions.redirectTo === expectedRedirect ? 'pass' : 'fail',
        description: 'Sign-in should redirect to dashboard'
      });

      // Test 7: Supabase Client Configuration
      try {
        const { data, error } = await supabase.auth.getSession();
        results.push({
          name: 'Supabase Connection',
          expected: 'No error',
          actual: error ? error.message : 'Connected',
          status: error ? 'fail' : 'pass',
          description: 'Supabase client should connect successfully'
        });
      } catch (error) {
        results.push({
          name: 'Supabase Connection',
          expected: 'No error',
          actual: error instanceof Error ? error.message : 'Unknown error',
          status: 'fail',
          description: 'Supabase client should connect successfully'
        });
      }

      setTestResults(results);
    } catch (error) {
      console.error('Error running URL tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const debugConfig = () => {
    debugUrlConfig();
    console.log('Auth Config:', {
      siteUrl: authConfig.getSiteUrl(),
      redirectUrls: authConfig.getRedirectUrls(),
      signInOptions: authConfig.getSignInOptions(),
      signUpOptions: authConfig.getSignUpOptions(),
      passwordResetOptions: authConfig.getPasswordResetOptions(),
    });
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pass: 'default',
      fail: 'destructive',
      warning: 'secondary',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Authentication URL Configuration Test
          {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
        </CardTitle>
        <CardDescription>
          Verify that all URL configurations are properly set for authentication
        </CardDescription>
        <div className="flex gap-2">
          <Button onClick={runTests} disabled={loading} size="sm">
            {loading ? 'Running Tests...' : 'Run Tests'}
          </Button>
          <Button onClick={debugConfig} variant="outline" size="sm">
            Debug Config
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {testResults.map((result, index) => (
            <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(result.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{result.name}</h4>
                  {getStatusBadge(result.status)}
                </div>
                <p className="text-sm text-gray-600 mb-2">{result.description}</p>
                <div className="text-xs space-y-1">
                  <div>
                    <span className="font-medium">Expected:</span>{' '}
                    <code className="bg-gray-100 px-1 rounded">{result.expected}</code>
                  </div>
                  <div>
                    <span className="font-medium">Actual:</span>{' '}
                    <code className="bg-gray-100 px-1 rounded">{result.actual}</code>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
