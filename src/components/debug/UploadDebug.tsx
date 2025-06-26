import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { documentsApi } from '@/lib/api/documents';
import { usageTrackingService } from '@/lib/services/usageTracking';

export const UploadDebug: React.FC = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      addResult('Starting upload diagnostics...');

      // Test 1: Check authentication
      addResult('1. Checking authentication...');
      if (!user) {
        addResult('❌ User not authenticated');
        return;
      }
      addResult(`✅ User authenticated: ${user.email}`);

      // Test 2: Check profile
      addResult('2. Checking user profile...');
      if (!profile) {
        addResult('❌ User profile not loaded');
        return;
      }
      addResult(`✅ Profile loaded: ${profile.email}, Tier: ${profile.subscription_tier || 'free'}`);

      // Test 3: Check Supabase connection
      addResult('3. Testing Supabase connection...');
      try {
        const { data, error } = await supabase.from('profiles').select('id').limit(1);
        if (error) throw error;
        addResult('✅ Supabase connection working');
      } catch (error: any) {
        addResult(`❌ Supabase connection failed: ${error.message}`);
        return;
      }

      // Test 4: Check storage buckets
      addResult('4. Checking storage buckets...');
      try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (error) throw error;
        const documentsBucket = buckets.find(b => b.id === 'documents');
        if (!documentsBucket) {
          addResult('❌ Documents bucket not found');
          return;
        }
        addResult('✅ Documents bucket exists');
      } catch (error: any) {
        addResult(`❌ Storage bucket check failed: ${error.message}`);
        return;
      }

      // Test 5: Check usage tracking
      addResult('5. Testing usage tracking...');
      try {
        const usageLimit = await usageTrackingService.checkUsageLimit('document_upload');
        addResult(`✅ Usage check successful: ${usageLimit.current}/${usageLimit.limit} used`);
        if (!usageLimit.allowed) {
          addResult('⚠️ Upload limit reached');
        }
      } catch (error: any) {
        addResult(`❌ Usage tracking failed: ${error.message}`);
      }

      // Test 6: Test file upload (with dummy file)
      addResult('6. Testing file upload...');
      try {
        const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
        
        // Check if we can upload
        const usageCheck = await usageTrackingService.checkUsageLimit('document_upload');
        if (!usageCheck.allowed) {
          addResult('⚠️ Skipping upload test - usage limit reached');
        } else {
          // Try to upload the test file
          const document = await documentsApi.uploadDocument(testFile, 'other');
          addResult(`✅ Test upload successful: ${document.id}`);
          
          // Clean up - delete the test file
          try {
            await documentsApi.deleteDocument(document.id);
            addResult('✅ Test file cleaned up');
          } catch (cleanupError: any) {
            addResult(`⚠️ Cleanup failed: ${cleanupError.message}`);
          }
        }
      } catch (error: any) {
        addResult(`❌ Upload test failed: ${error.message}`);
      }

      addResult('🎉 Diagnostics completed!');

    } catch (error: any) {
      addResult(`❌ Diagnostics failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testStoragePermissions = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      addResult('Testing storage permissions...');
      
      // Test storage upload directly
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const fileName = `${user?.id}/test-${Date.now()}.txt`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, testFile);
      
      if (uploadError) {
        addResult(`❌ Storage upload failed: ${uploadError.message}`);
      } else {
        addResult('✅ Storage upload successful');
        
        // Clean up
        const { error: deleteError } = await supabase.storage
          .from('documents')
          .remove([fileName]);
        
        if (deleteError) {
          addResult(`⚠️ Cleanup failed: ${deleteError.message}`);
        } else {
          addResult('✅ Cleanup successful');
        }
      }
    } catch (error: any) {
      addResult(`❌ Storage test failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  if (loading) {
    return <div>Loading auth state...</div>;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Diagnostics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={runDiagnostics}
            disabled={isRunning || !user}
          >
            {isRunning ? 'Running...' : 'Run Full Diagnostics'}
          </Button>
          <Button
            onClick={testStoragePermissions}
            disabled={isRunning || !user}
            variant="outline"
          >
            Test Storage Only
          </Button>
          <Button
            onClick={refreshProfile}
            disabled={isRunning || !user}
            variant="outline"
          >
            Refresh Profile
          </Button>
        </div>

        {!user && (
          <Alert>
            <AlertDescription>
              Please log in to run upload diagnostics.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <h3 className="font-semibold">Current State:</h3>
          <div className="text-sm space-y-1">
            <div>User: {user ? user.email : 'Not authenticated'}</div>
            <div>Profile: {profile ? `${profile.email} (${profile.subscription_tier || 'free'})` : 'Not loaded'}</div>
            <div>Loading: {loading ? 'Yes' : 'No'}</div>
          </div>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Test Results:</h3>
            <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
