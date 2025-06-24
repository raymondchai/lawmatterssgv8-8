import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Globe, Database, Key, Upload } from 'lucide-react';

interface DiagnosticResult {
  category: string;
  name: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  details?: any;
  fix?: string;
}

const ProductionDiagnostics: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnostics: DiagnosticResult[] = [];

    // 1. Environment Check
    const envVars = {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
      VITE_APP_URL: import.meta.env.VITE_APP_URL,
      NODE_ENV: import.meta.env.NODE_ENV,
      MODE: import.meta.env.MODE,
    };

    const missingEnvVars = Object.entries(envVars).filter(([key, value]) => !value);
    diagnostics.push({
      category: 'Environment',
      name: 'Environment Variables',
      status: missingEnvVars.length > 0 ? 'error' : 'success',
      message: missingEnvVars.length > 0 
        ? `Missing: ${missingEnvVars.map(([key]) => key).join(', ')}`
        : 'All environment variables present',
      details: envVars,
      fix: missingEnvVars.length > 0 ? 'Check your hosting platform environment variables configuration' : undefined
    });

    // 2. URL Configuration
    const currentUrl = window.location.origin;
    const configuredUrl = import.meta.env.VITE_APP_URL;
    diagnostics.push({
      category: 'Configuration',
      name: 'URL Configuration',
      status: currentUrl === configuredUrl ? 'success' : 'warning',
      message: `Current: ${currentUrl}, Configured: ${configuredUrl}`,
      details: { currentUrl, configuredUrl },
      fix: currentUrl !== configuredUrl ? 'Update VITE_APP_URL environment variable to match production URL' : undefined
    });

    // 3. Supabase Connection
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      
      diagnostics.push({
        category: 'Database',
        name: 'Supabase Connection',
        status: error ? 'error' : 'success',
        message: error ? `Connection failed: ${error.message}` : 'Connected successfully',
        details: { data, error },
        fix: error ? 'Check Supabase URL and API key configuration' : undefined
      });
    } catch (error) {
      diagnostics.push({
        category: 'Database',
        name: 'Supabase Connection',
        status: 'error',
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error,
        fix: 'Check if Supabase is properly configured and imported'
      });
    }

    // 4. Authentication Status
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user }, error } = await supabase.auth.getUser();
      
      diagnostics.push({
        category: 'Authentication',
        name: 'User Session',
        status: error ? 'error' : user ? 'success' : 'warning',
        message: error ? `Auth error: ${error.message}` : user ? `Logged in as ${user.email}` : 'Not authenticated',
        details: { user: user ? { id: user.id, email: user.email } : null, error },
        fix: !user && !error ? 'User needs to log in to access document features' : undefined
      });
    } catch (error) {
      diagnostics.push({
        category: 'Authentication',
        name: 'User Session',
        status: 'error',
        message: `Auth check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }

    // 5. Document API Test
    try {
      const { documentsApi } = await import('@/lib/api/documents');
      const documents = await documentsApi.getDocuments();
      
      diagnostics.push({
        category: 'API',
        name: 'Documents API',
        status: 'success',
        message: `Successfully fetched ${documents.length} documents`,
        details: { count: documents.length, sample: documents.slice(0, 2) }
      });
    } catch (error) {
      diagnostics.push({
        category: 'API',
        name: 'Documents API',
        status: 'error',
        message: `API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error,
        fix: 'Check database schema and RLS policies for uploaded_documents table'
      });
    }

    // 6. Storage Bucket Test
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.storage.listBuckets();
      const documentsBucket = data?.find(bucket => bucket.name === 'documents');
      
      diagnostics.push({
        category: 'Storage',
        name: 'Documents Bucket',
        status: error ? 'error' : documentsBucket ? 'success' : 'error',
        message: error ? `Storage error: ${error.message}` : documentsBucket ? 'Documents bucket exists' : 'Documents bucket not found',
        details: { buckets: data?.map(b => b.name), error },
        fix: !documentsBucket ? 'Create documents storage bucket in Supabase dashboard' : undefined
      });
    } catch (error) {
      diagnostics.push({
        category: 'Storage',
        name: 'Documents Bucket',
        status: 'error',
        message: `Storage check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }

    // 7. Console Errors Check
    const consoleErrors = (window as any).__consoleErrors || [];
    diagnostics.push({
      category: 'Runtime',
      name: 'Console Errors',
      status: consoleErrors.length > 0 ? 'warning' : 'success',
      message: consoleErrors.length > 0 ? `${consoleErrors.length} console errors detected` : 'No console errors detected',
      details: consoleErrors.slice(0, 5),
      fix: consoleErrors.length > 0 ? 'Check browser console for detailed error messages' : undefined
    });

    setResults(diagnostics);
    setIsRunning(false);
  };

  useEffect(() => {
    // Capture console errors
    const originalError = console.error;
    (window as any).__consoleErrors = [];
    
    console.error = (...args) => {
      (window as any).__consoleErrors.push(args.join(' '));
      originalError.apply(console, args);
    };

    runDiagnostics();

    return () => {
      console.error = originalError;
    };
  }, []);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'pending':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Environment':
      case 'Configuration':
        return <Globe className="h-4 w-4" />;
      case 'Database':
        return <Database className="h-4 w-4" />;
      case 'Authentication':
        return <Key className="h-4 w-4" />;
      case 'Storage':
        return <Upload className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, DiagnosticResult[]>);

  return (
    <Card className="max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Production Diagnostics
          <Button onClick={runDiagnostics} disabled={isRunning} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running...' : 'Run Diagnostics'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedResults).map(([category, categoryResults]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center">
                {getCategoryIcon(category)}
                <span className="ml-2">{category}</span>
              </h3>
              <div className="space-y-2">
                {categoryResults.map((result, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <h4 className="font-medium">{result.name}</h4>
                      <p className="text-sm text-gray-600">{result.message}</p>
                      {result.fix && (
                        <p className="text-sm text-blue-600 mt-1">
                          <strong>Fix:</strong> {result.fix}
                        </p>
                      )}
                      {process.env.NODE_ENV === 'development' && result.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer">Details</summary>
                          <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-32">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductionDiagnostics;
