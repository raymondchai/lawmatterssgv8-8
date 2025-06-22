import React, { useEffect, useState } from 'react';
import { legalQAApi } from '@/lib/api/legalQA';

export const ApiTest: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testApi = async () => {
      try {
        console.log('Testing API...');
        
        // Test categories
        const categoriesData = await legalQAApi.getCategories();
        console.log('Categories:', categoriesData);
        setCategories(categoriesData);
        
        // Test questions
        const questionsData = await legalQAApi.getQuestions();
        console.log('Questions:', questionsData);
        setQuestions(questionsData);
        
      } catch (err: any) {
        console.error('API Test Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    testApi();
  }, []);

  if (loading) {
    return <div>Loading API test...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">API Test Results</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Categories ({categories.length})</h3>
        <ul className="list-disc pl-5">
          {categories.map((cat) => (
            <li key={cat.id}>{cat.name} - {cat.color}</li>
          ))}
        </ul>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">Questions ({questions.length})</h3>
        <ul className="list-disc pl-5">
          {questions.map((q) => (
            <li key={q.id}>{q.title} - {q.category?.name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
