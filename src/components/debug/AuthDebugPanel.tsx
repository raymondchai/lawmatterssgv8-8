/**
 * Authentication Debug Panel Component
 * Provides a UI for debugging authentication issues
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  debugAuthentication, 
  clearAuthData, 
  testAuthFlow, 
  logAuthDebug,
  type AuthDebugInfo 
} from '@/lib/auth/debug';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Trash2, TestTube } from 'lucide-react';

export function AuthDebugPanel() {
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('testpassword123');
  const [testResults, setTestResults] = useState<any>(null);

  const loadDebugInfo = async () => {
    setLoading(true);
    try {
      const info = await debugAuthentication();
      setDebugInfo(info);
    } catch (error) {
      console.error('Failed to load debug info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAuth = async () => {
    setLoading(true);
    try {
      await clearAuthData();
      await loadDebugInfo();
      alert('Authentication data cleared successfully!');
    } catch (error) {
      alert('Failed to clear authentication data: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestAuth = async () => {
    setLoading(true);
    try {
      const results = await testAuthFlow(testEmail, testPassword);
      setTestResults(results);
    } catch (error) {
      setTestResults({
        success: false,
        steps: [{ step: 'Test initialization', success: false, error: String(error) }]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogDebug = async () => {
    await logAuthDebug();
    alert('Debug information logged to console. Check browser developer tools.');
  };

  useEffect(() => {
    loadDebugInfo();
  }, []);

  if (!debugInfo) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            Loading Authentication Debug Info...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Authentication Debug Panel
          </CardTitle>
          <CardDescription>
            Diagnose and fix authentication configuration issues
          </CardDescription>
          <div className="flex gap-2">
            <Button onClick={loadDebugInfo} disabled={loading} size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleClearAuth} variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Auth Data
            </Button>
            <Button onClick={handleLogDebug} variant="outline" size="sm">
              Log to Console
            </Button>
          </div>
        </CardHeader>
      </Card>

      {debugInfo.recommendations.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Issues Found:</strong>
            <ul className="mt-2 list-disc list-inside space-y-1">
              {debugInfo.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="urls">URLs</TabsTrigger>
          <TabsTrigger value="session">Session</TabsTrigger>
          <TabsTrigger value="test">Test Auth</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Environment</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={debugInfo.environment.viteEnv === 'production' ? 'default' : 'secondary'}>
                  {debugInfo.environment.viteEnv}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Supabase Config</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {debugInfo.environment.hasAnonKey ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    {debugInfo.environment.hasAnonKey ? 'Configured' : 'Missing Keys'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Auth Session</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {debugInfo.authState.hasSession ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    {debugInfo.authState.hasSession ? 'Active' : 'No Session'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Local Storage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {debugInfo.localStorage.hasSupabaseSession ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    {debugInfo.localStorage.sessionKeys.length} keys
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="environment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Environment Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Node Environment</Label>
                  <div className="mt-1 p-2 bg-gray-100 rounded text-sm">
                    {debugInfo.environment.nodeEnv}
                  </div>
                </div>
                <div>
                  <Label>Vite Environment</Label>
                  <div className="mt-1 p-2 bg-gray-100 rounded text-sm">
                    {debugInfo.environment.viteEnv}
                  </div>
                </div>
                <div>
                  <Label>App URL</Label>
                  <div className="mt-1 p-2 bg-gray-100 rounded text-sm">
                    {debugInfo.environment.appUrl}
                  </div>
                </div>
                <div>
                  <Label>Supabase URL</Label>
                  <div className="mt-1 p-2 bg-gray-100 rounded text-sm">
                    {debugInfo.environment.supabaseUrl}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="urls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>URL Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Current URL</Label>
                <div className="mt-1 p-2 bg-gray-100 rounded text-sm">
                  {debugInfo.urlConfiguration.currentUrl}
                </div>
              </div>
              <div>
                <Label>Origin</Label>
                <div className="mt-1 p-2 bg-gray-100 rounded text-sm">
                  {debugInfo.urlConfiguration.origin}
                </div>
              </div>
              <div>
                <Label>Expected Redirect URLs</Label>
                <div className="mt-1 space-y-1">
                  {debugInfo.urlConfiguration.expectedRedirectUrls.map((url, index) => (
                    <div key={index} className="p-2 bg-gray-100 rounded text-sm">
                      {url}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="session" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {debugInfo.authState.hasSession ? (
                <div className="space-y-4">
                  <div>
                    <Label>User ID</Label>
                    <div className="mt-1 p-2 bg-gray-100 rounded text-sm">
                      {debugInfo.authState.user?.id}
                    </div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <div className="mt-1 p-2 bg-gray-100 rounded text-sm">
                      {debugInfo.authState.user?.email}
                    </div>
                  </div>
                  <div>
                    <Label>Session Expiry</Label>
                    <div className="mt-1 p-2 bg-gray-100 rounded text-sm">
                      {debugInfo.authState.sessionExpiry}
                    </div>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No active session found</AlertDescription>
                </Alert>
              )}
              
              <div>
                <Label>Local Storage Keys</Label>
                <div className="mt-1 space-y-1">
                  {debugInfo.localStorage.sessionKeys.map((key, index) => (
                    <div key={index} className="p-2 bg-gray-100 rounded text-sm">
                      {key}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Test Authentication Flow
              </CardTitle>
              <CardDescription>
                Test the complete authentication flow with a test account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="test-email">Test Email</Label>
                  <Input
                    id="test-email"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="test-password">Test Password</Label>
                  <Input
                    id="test-password"
                    type="password"
                    value={testPassword}
                    onChange={(e) => setTestPassword(e.target.value)}
                    placeholder="testpassword123"
                  />
                </div>
              </div>
              
              <Button onClick={handleTestAuth} disabled={loading}>
                <TestTube className="h-4 w-4 mr-2" />
                Run Authentication Test
              </Button>

              {testResults && (
                <div className="space-y-2">
                  <h4 className="font-medium">Test Results:</h4>
                  {testResults.steps.map((step: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      {step.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="flex-1">{step.step}</span>
                      {step.error && (
                        <span className="text-sm text-red-600">{step.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
