import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export const SimpleUploadTest: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<string>('');
  const { user } = useAuth();

  const testUpload = async () => {
    if (!user) {
      setResult('❌ Error: No authenticated user');
      return;
    }

    setIsUploading(true);
    setResult('🔄 Testing upload...');

    try {
      // Create a simple test file
      const testContent = 'This is a test document for upload testing.';
      const testFile = new File([testContent], 'test-upload.txt', { type: 'text/plain' });
      
      // Test 1: Upload to storage
      const fileName = `${user.id}/test-${Date.now()}.txt`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, testFile);

      if (uploadError) {
        setResult(`❌ Storage upload failed: ${uploadError.message}`);
        setIsUploading(false);
        return;
      }

      setResult('✅ Storage upload successful! Testing database...');

      // Test 2: Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Test 3: Insert into database
      const { data, error: dbError } = await supabase
        .from('uploaded_documents')
        .insert({
          user_id: user.id,
          filename: testFile.name,
          file_url: publicUrl,
          file_size: testFile.size,
          document_type: 'test',
          processing_status: 'pending'
        })
        .select()
        .single();

      if (dbError) {
        setResult(`❌ Database insert failed: ${dbError.message}`);
        // Clean up uploaded file
        await supabase.storage.from('documents').remove([fileName]);
        setIsUploading(false);
        return;
      }

      setResult('✅ Database insert successful! Cleaning up...');

      // Test 4: Clean up
      await supabase.from('uploaded_documents').delete().eq('id', data.id);
      await supabase.storage.from('documents').remove([fileName]);

      setResult('✅ Upload test completed successfully! All systems working.');

    } catch (error) {
      setResult(`❌ Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    setIsUploading(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Simple Upload Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            onClick={testUpload} 
            disabled={isUploading || !user}
          >
            {isUploading ? 'Testing...' : 'Test Upload'}
          </Button>
          {!user && (
            <span className="text-sm text-red-600">
              Please sign in to test upload
            </span>
          )}
        </div>
        
        {result && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <pre className="text-sm whitespace-pre-wrap">{result}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
