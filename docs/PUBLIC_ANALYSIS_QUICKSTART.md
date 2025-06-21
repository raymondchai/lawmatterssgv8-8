# Public Document Analysis - Quick Start Guide

## Overview

Get started with the Public Document Analysis feature in 5 minutes. This guide will walk you through setting up and using the free document analysis functionality.

## What You'll Build

A simple document analysis interface that allows users to:
- Upload PDF or image files
- Get instant document insights
- View analysis results
- Track usage with analytics

## Prerequisites

- Node.js 18+ and npm/yarn
- Supabase project
- Basic knowledge of React/TypeScript

## Step 1: Setup

### Install Dependencies

```bash
npm install @supabase/supabase-js react-dropzone
```

### Environment Variables

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Step 2: Database Setup

Run the migration to create required tables:

```sql
-- Create public analysis sessions table
CREATE TABLE public_analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  user_agent TEXT,
  documents_analyzed INTEGER DEFAULT 0,
  total_storage_used BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Create public document analyses table
CREATE TABLE public_document_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public_analysis_sessions(id),
  ip_address INET NOT NULL,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  analysis_result JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('public-documents', 'public-documents', false, 10485760);
```

## Step 3: Deploy Edge Functions

Deploy the required Supabase Edge Functions:

```bash
# Deploy rate limiter
supabase functions deploy public-rate-limiter

# Deploy document analysis
supabase functions deploy public-document-analysis

# Deploy cleanup function
supabase functions deploy cleanup-public-data
```

## Step 4: Create the Analysis Component

```tsx
// components/PublicDocumentAnalyzer.tsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

interface AnalysisResult {
  summary: string;
  keyWords: string[];
  documentType: string;
  textLength: number;
  ocrQuality: number;
}

export function PublicDocumentAnalyzer() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeDocument = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      // Get user IP
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();

      // Check rate limits
      const { data: rateLimit, error: rateLimitError } = await supabase.functions.invoke('public-rate-limiter', {
        body: { ipAddress: ip, action: 'check' }
      });

      if (rateLimitError || !rateLimit.allowed) {
        throw new Error(rateLimit?.message || 'Rate limit exceeded');
      }

      // Convert file to base64
      const fileContent = await fileToBase64(file);

      // Analyze document
      const { data, error: analysisError } = await supabase.functions.invoke('public-document-analysis', {
        body: {
          sessionId: crypto.randomUUID(),
          ipAddress: ip,
          filename: file.name,
          fileSize: file.size,
          fileType: file.type,
          fileContent
        }
      });

      if (analysisError || !data.success) {
        throw new Error(data?.error || 'Analysis failed');
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      if (files.length > 0) {
        analyzeDocument(files[0]);
      }
    },
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Free Document Analysis</h1>
      
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <div className="text-4xl">📄</div>
          <div>
            <p className="text-lg font-medium">
              {isDragActive ? 'Drop your file here' : 'Drag & drop a document'}
            </p>
            <p className="text-gray-600">or click to browse</p>
          </div>
          <div className="text-sm text-gray-500">
            Supports PDF, JPEG, PNG, WebP (max 10MB)
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isAnalyzing && (
        <div className="mt-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Analyzing document...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-6 space-y-4">
          <h2 className="text-xl font-semibold">Analysis Results</h2>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Document Type</h3>
            <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
              {result.documentType}
            </span>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Summary</h3>
            <p className="text-gray-700">{result.summary}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Key Terms</h3>
            <div className="flex flex-wrap gap-2">
              {result.keyWords.map((word, index) => (
                <span
                  key={index}
                  className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Document Stats</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Text Length:</span>
                <span className="ml-2 font-medium">{result.textLength.toLocaleString()} characters</span>
              </div>
              <div>
                <span className="text-gray-600">OCR Quality:</span>
                <span className="ml-2 font-medium">{Math.round(result.ocrQuality * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Step 5: Add to Your App

```tsx
// App.tsx
import { PublicDocumentAnalyzer } from './components/PublicDocumentAnalyzer';

function App() {
  return (
    <div className="App">
      <PublicDocumentAnalyzer />
    </div>
  );
}

export default App;
```

## Step 6: Add Styling (Optional)

Install Tailwind CSS for styling:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Configure `tailwind.config.js`:

```js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Add to your CSS:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Step 7: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to your app

3. Try uploading a PDF or image file

4. Verify the analysis results appear correctly

## Next Steps

### Add Analytics Tracking

```tsx
// Track user interactions
const trackAnalysis = async (fileType: string, fileSize: number) => {
  await supabase.from('public_analytics_events').insert({
    event_type: 'document_analysis',
    event_data: { fileType, fileSize },
    session_id: sessionId,
    ip_address: userIP
  });
};
```

### Add Rate Limit Display

```tsx
// Show remaining usage
const [rateLimitStatus, setRateLimitStatus] = useState(null);

// Check and display rate limits
useEffect(() => {
  checkRateLimit().then(setRateLimitStatus);
}, []);
```

### Add Error Handling

```tsx
// Enhanced error handling
const handleError = (error: Error) => {
  if (error.message.includes('rate limit')) {
    // Show upgrade prompt
    showUpgradeModal();
  } else if (error.message.includes('file size')) {
    // Show file size error
    showFileSizeError();
  } else {
    // Generic error
    showGenericError(error.message);
  }
};
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your domain is added to Supabase allowed origins
2. **Rate Limit Issues**: Check IP detection and rate limit logic
3. **File Upload Failures**: Verify file size and type restrictions
4. **Analysis Errors**: Check Edge Function logs in Supabase dashboard

### Debug Mode

Enable debug logging:

```tsx
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Analysis request:', { file, sessionId, ip });
  console.log('Analysis response:', result);
}
```

## Production Checklist

- [ ] Environment variables configured
- [ ] Edge Functions deployed
- [ ] Database migrations applied
- [ ] Storage bucket created with proper policies
- [ ] Rate limiting tested
- [ ] Error handling implemented
- [ ] Analytics tracking added
- [ ] CORS configured
- [ ] File validation working
- [ ] Cleanup job scheduled

## Support

Need help? Check out:
- [Full API Documentation](./PUBLIC_DOCUMENT_ANALYSIS_API.md)
- [Supabase Documentation](https://supabase.com/docs)
- [React Dropzone Documentation](https://react-dropzone.js.org/)

Happy coding! 🚀
