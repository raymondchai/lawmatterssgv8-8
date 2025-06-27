/**
 * Debug Page - Authentication and System Debugging
 * Accessible at /debug for troubleshooting authentication issues
 */

import React from 'react';
import { AuthDebugPanel } from '@/components/debug/AuthDebugPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function DebugPage() {
  // Only show in development or when explicitly enabled
  const isDevelopment = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG === 'true';
  
  if (!isDevelopment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Debug Mode Disabled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Debug tools are only available in development mode or when explicitly enabled.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            LawMattersSG Debug Console
          </h1>
          <p className="text-gray-600">
            Comprehensive debugging tools for authentication and system diagnostics
          </p>
        </div>

        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Development Mode:</strong> This debug console is only available in development. 
            It provides detailed system information that should not be exposed in production.
          </AlertDescription>
        </Alert>

        <AuthDebugPanel />
      </div>
    </div>
  );
}
