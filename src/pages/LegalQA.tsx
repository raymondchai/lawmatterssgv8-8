import React, { useState } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { LegalQABrowser, AskQuestionForm } from '@/components/qa';
import { TestQA } from '@/components/qa/TestQA';
import type { LegalQuestion } from '@/types';

const LegalQA = () => {
  const [showAskForm, setShowAskForm] = useState(false);

  const handleQuestionCreated = (question: LegalQuestion) => {
    setShowAskForm(false);
    // Optionally refresh the questions list or navigate to the new question
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="py-8 pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Debug info */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-800">Legal Q&A Page Loaded Successfully</p>
            <p className="text-sm text-blue-600">Environment: {import.meta.env.MODE}</p>
            <p className="text-sm text-blue-600">Supabase URL: {import.meta.env.VITE_SUPABASE_URL}</p>
          </div>

          <TestQA />

          <LegalQABrowser onAskQuestion={() => setShowAskForm(true)} />
        </div>
      </main>

      <Footer />

      {/* Ask Question Modal */}
      {showAskForm && (
        <AskQuestionForm
          onClose={() => setShowAskForm(false)}
          onQuestionCreated={handleQuestionCreated}
        />
      )}
    </div>
  );
};

export default LegalQA;
