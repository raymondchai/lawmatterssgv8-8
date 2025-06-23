import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const SupabaseConnectionTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [profileStatus, setProfileStatus] = useState<'loading' | 'exists' | 'missing' | 'error'>('loading');

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test basic connection with a simple query that doesn't require auth
        const { error: connectionError } = await supabase.auth.getSession();

        if (connectionError) {
          setConnectionStatus('error');
          setError(connectionError.message);
          return;
        }

        setConnectionStatus('success');

        // Test auth status
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
          setAuthStatus('unauthenticated');
          setProfileStatus('missing');
        } else if (user) {
          setAuthStatus('authenticated');

          // Test profile
          const { error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError) {
            if (profileError.code === 'PGRST116') {
              setProfileStatus('missing');
            } else {
              setProfileStatus('error');
            }
          } else {
            setProfileStatus('exists');
          }
        } else {
          setAuthStatus('unauthenticated');
          setProfileStatus('missing');
        }

      } catch (err: any) {
        console.error('Connection test error:', err);
        setConnectionStatus('error');
        setError(err.message);
        setAuthStatus('unauthenticated');
        setProfileStatus('missing');
      }
    };

    testConnection();
  }, []);

  const getStatusBadge = (status: string, successText: string, errorText: string, loadingText: string) => {
    switch (status) {
      case 'success':
      case 'exists':
      case 'authenticated':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />{successText}</Badge>;
      case 'error':
      case 'missing':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{errorText}</Badge>;
      case 'unauthenticated':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Not Authenticated</Badge>;
      default:
        return <Badge variant="outline"><Loader2 className="w-3 h-3 mr-1 animate-spin" />{loadingText}</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Supabase Connection Status</CardTitle>
        <CardDescription>Debug information for authentication issues</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Database Connection:</span>
          {getStatusBadge(connectionStatus, 'Connected', 'Failed', 'Testing...')}
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Authentication:</span>
          {getStatusBadge(authStatus, 'Authenticated', 'Error', 'Checking...')}
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Profile:</span>
          {getStatusBadge(profileStatus, 'Exists', 'Missing', 'Loading...')}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800 font-medium">Error Details:</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Project:</strong> kvlaydeyqidlfpfutbmp</p>
          <p><strong>URL:</strong> {import.meta.env.VITE_SUPABASE_URL}</p>
          <p><strong>Environment:</strong> {import.meta.env.VITE_ENVIRONMENT}</p>
        </div>
      </CardContent>
    </Card>
  );
};
