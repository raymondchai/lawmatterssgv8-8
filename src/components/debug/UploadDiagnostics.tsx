import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface DiagnosticResult {
  category: string;
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
  fix?: string;
}

export const UploadDiagnostics: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { user, profile } = useAuth();

  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnostics: DiagnosticResult[] = [];

    // 1. Authentication Check
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      diagnostics.push({
        category: 'Authentication',
        name: 'User Session',
        status: session?.user ? 'success' : 'error',
        message: session?.user ? `Authenticated as ${session.user.email}` : 'No active session',
        details: { user: session?.user, error },
        fix: !session?.user ? 'Please sign in to upload documents' : undefined
      });
    } catch (error) {
      diagnostics.push({
        category: 'Authentication',
        name: 'User Session',
        status: 'error',
        message: `Session check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error,
        fix: 'Check authentication configuration'
      });
    }

    // 2. Profile Check
    diagnostics.push({
      category: 'User',
      name: 'Profile Data',
      status: profile ? 'success' : 'warning',
      message: profile ? `Profile loaded: ${profile.subscription_tier} tier` : 'Profile not loaded',
      details: profile,
      fix: !profile ? 'Profile may still be loading or missing' : undefined
    });

    // 3. Storage Bucket Access
    try {
      const { data, error } = await supabase.storage.from('documents').list('', { limit: 1 });
      
      diagnostics.push({
        category: 'Storage',
        name: 'Documents Bucket',
        status: error ? 'error' : 'success',
        message: error ? `Bucket access failed: ${error.message}` : 'Bucket accessible',
        details: { data, error },
        fix: error ? 'Check storage bucket permissions and RLS policies' : undefined
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

    // 4. Database Table Access
    try {
      const { data, error } = await supabase
        .from('uploaded_documents')
        .select('count')
        .limit(1);
      
      diagnostics.push({
        category: 'Database',
        name: 'Documents Table',
        status: error ? 'error' : 'success',
        message: error ? `Table access failed: ${error.message}` : 'Table accessible',
        details: { data, error },
        fix: error ? 'Check RLS policies for uploaded_documents table' : undefined
      });
    } catch (error) {
      diagnostics.push({
        category: 'Database',
        name: 'Documents Table',
        status: 'error',
        message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }

    // 5. Test File Upload (Small test file)
    if (user) {
      try {
        const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
        const fileName = `${user.id}/test-${Date.now()}.txt`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, testFile);

        if (!uploadError) {
          // Clean up test file
          await supabase.storage.from('documents').remove([fileName]);
        }

        diagnostics.push({
          category: 'Upload',
          name: 'Test File Upload',
          status: uploadError ? 'error' : 'success',
          message: uploadError ? `Upload failed: ${uploadError.message}` : 'Upload successful',
          details: uploadError,
          fix: uploadError ? 'Check storage permissions and file size limits' : undefined
        });
      } catch (error) {
        diagnostics.push({
          category: 'Upload',
          name: 'Test File Upload',
          status: 'error',
          message: `Upload test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: error
        });
      }
    } else {
      diagnostics.push({
        category: 'Upload',
        name: 'Test File Upload',
        status: 'warning',
        message: 'Skipped - no authenticated user',
        fix: 'Sign in to test file upload'
      });
    }

    setResults(diagnostics);
    setIsRunning(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Diagnostics</CardTitle>
        <Button onClick={runDiagnostics} disabled={isRunning}>
          {isRunning ? 'Running Diagnostics...' : 'Run Upload Diagnostics'}
        </Button>
      </CardHeader>
      <CardContent>
        {results.length > 0 && (
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{result.category}</span>
                    <span className="text-gray-600">•</span>
                    <span>{result.name}</span>
                  </div>
                  <Badge className={getStatusColor(result.status)}>
                    {result.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-700 mb-2">{result.message}</p>
                {result.fix && (
                  <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                    💡 {result.fix}
                  </p>
                )}
                {result.details && (
                  <details className="mt-2">
                    <summary className="text-sm text-gray-500 cursor-pointer">
                      View Details
                    </summary>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadDiagnostics;
