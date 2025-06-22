import React, { useState, useEffect } from 'react';
import { legalQAApi } from '@/lib/api/legalQA';

export const TestQA: React.FC = () => {
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runTests = async () => {
      console.log('Running QA API tests...');
      
      try {
        // Test environment
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const isPlaceholder = supabaseUrl?.includes('placeholder');
        
        console.log('Environment:', { supabaseUrl, isPlaceholder });
        
        // Test categories
        console.log('Testing getCategories...');
        const categories = await legalQAApi.getCategories();
        console.log('Categories result:', categories);
        
        // Test questions
        console.log('Testing getQuestions...');
        const questions = await legalQAApi.getQuestions();
        console.log('Questions result:', questions);
        
        setTestResults({
          environment: { supabaseUrl, isPlaceholder },
          categories: categories,
          questions: questions,
          success: true
        });
        
      } catch (error) {
        console.error('Test error:', error);
        setTestResults({
          error: error.message,
          success: false
        });
      } finally {
        setLoading(false);
      }
    };
    
    runTests();
  }, []);

  if (loading) {
    return <div className="p-4">Running tests...</div>;
  }

  return (
    <div className="p-4 bg-gray-50 rounded">
      <h3 className="text-lg font-bold mb-4">QA API Test Results</h3>
      <pre className="bg-white p-4 rounded text-sm overflow-auto max-h-96">
        {JSON.stringify(testResults, null, 2)}
      </pre>
    </div>
  );
};
