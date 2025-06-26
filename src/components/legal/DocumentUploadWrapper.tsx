import React, { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { DocumentUpload } from './DocumentUpload';
import { DocumentUploadFallback } from './DocumentUploadFallback';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Upload } from 'lucide-react';

interface DocumentUploadWrapperProps {
  onUploadComplete?: (documentId: string) => void;
  maxFiles?: number;
}

/**
 * Loading fallback component
 */
const UploadLoadingFallback: React.FC = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center">
        <Upload className="h-5 w-5 mr-2" />
        Document Upload
      </CardTitle>
      <CardDescription>
        Loading upload interface...
      </CardDescription>
    </CardHeader>
    <CardContent className="flex items-center justify-center py-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-sm text-gray-600">Initializing upload component...</p>
      </div>
    </CardContent>
  </Card>
);

/**
 * Error fallback component
 */
const UploadErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({ 
  error, 
  resetErrorBoundary 
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center text-red-600">
        <AlertCircle className="h-5 w-5 mr-2" />
        Upload Error
      </CardTitle>
      <CardDescription>
        The upload component encountered an error
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error.message || 'An unexpected error occurred while loading the upload component.'}
        </AlertDescription>
      </Alert>
      
      <div className="flex space-x-2">
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
      
      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer">Technical Details</summary>
        <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
          {error.stack}
        </pre>
      </details>
    </CardContent>
  </Card>
);

/**
 * Wrapper component that provides error boundaries and fallbacks for document upload
 */
export const DocumentUploadWrapper: React.FC<DocumentUploadWrapperProps> = (props) => {
  return (
    <ErrorBoundary
      FallbackComponent={UploadErrorFallback}
      onError={(error, errorInfo) => {
        console.error('DocumentUpload Error:', error, errorInfo);
        
        // Log to external service if available
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'exception', {
            description: error.message,
            fatal: false,
          });
        }
      }}
      onReset={() => {
        // Clear any cached state that might be causing issues
        console.log('Resetting DocumentUpload component');
      }}
    >
      <Suspense fallback={<UploadLoadingFallback />}>
        <DocumentUploadWithFallback {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

/**
 * Component that tries the main upload first, then falls back to basic upload
 */
const DocumentUploadWithFallback: React.FC<DocumentUploadWrapperProps> = (props) => {
  const [useMainUpload, setUseMainUpload] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    // Reset error state when props change
    setHasError(false);
  }, [props]);

  if (hasError || !useMainUpload) {
    return <DocumentUploadFallback {...props} />;
  }

  return (
    <ErrorBoundary
      FallbackComponent={() => {
        setHasError(true);
        return <DocumentUploadFallback {...props} />;
      }}
      onError={(error) => {
        console.error('Main DocumentUpload failed, switching to fallback:', error);
        setUseMainUpload(false);
        setHasError(true);
      }}
    >
      <DocumentUpload {...props} />
    </ErrorBoundary>
  );
};
