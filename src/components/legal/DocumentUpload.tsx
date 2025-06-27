import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, X, CheckCircle, AlertCircle, Brain, Eye, Zap } from 'lucide-react';
import { documentsApi } from '@/lib/api/documents';
import { processDocument, type ProcessingStatus } from '@/lib/services/documentProcessor';
import { DOCUMENT_TYPES, FILE_UPLOAD } from '@/lib/config/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useRealTime, useRealTimeSimulation } from '@/hooks/useRealTimeUpdates';
import { DocumentProcessingIndicator } from '@/components/ui/RealTimeStatusIndicator';
import { realtimeService } from '@/lib/services/websocket';
import { toast } from '@/components/ui/sonner';

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  documentType?: string;
  documentId?: string;
  processingStage?: ProcessingStatus['stage'];
  processingMessage?: string;
}

interface DocumentUploadProps {
  onUploadComplete?: (documentId: string) => void;
  maxFiles?: number;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUploadComplete,
  maxFiles = 5
}) => {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCheckingLimits, setIsCheckingLimits] = useState(false);
  const { profile, loading: authLoading } = useAuth();
  const { simulateDocumentProcessing } = useRealTimeSimulation();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Allow upload even if profile isn't loaded yet, but warn user
    if (!profile && !authLoading) {
      toast.warning('Profile not fully loaded. Upload will proceed with default settings.');
    }

    // Set checking limits state
    setIsCheckingLimits(true);

    // Check usage limits with timeout and fallback
    const checkLimitsAndProcess = async () => {
      try {
        // Only check usage limits if we have a profile loaded
        if (profile) {
          const { usageTrackingService } = await import('@/lib/services/usageTracking');

          // Add timeout to prevent hanging
          const usageCheckPromise = usageTrackingService.checkUsageLimit('document_upload');
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Usage check timeout')), 5000)
          );

          const usageLimit = await Promise.race([usageCheckPromise, timeoutPromise]) as any;

          if (!usageLimit.allowed) {
            toast.error(`Upload limit reached. You have used ${usageLimit.current}/${usageLimit.limit} document uploads this month. Please upgrade your plan to continue.`);
            setIsCheckingLimits(false);
            return;
          }

          // Warn if approaching limit (80% or more)
          if (usageLimit.percentage >= 80) {
            toast.warning(`You have used ${usageLimit.current}/${usageLimit.limit} document uploads this month (${Math.round(usageLimit.percentage)}%).`);
          }
        } else {
          // Profile not loaded, proceed with warning
          toast.warning('Profile not loaded. Upload will proceed with default free tier limits.');
        }
      } catch (error) {
        console.error('Error checking usage limits:', error);
        // Allow upload to continue with warning instead of blocking
        toast.warning('Unable to verify upload limits. Upload will proceed but may be subject to restrictions.');
      }

      setIsCheckingLimits(false);
      processFiles(acceptedFiles);
    };

    checkLimitsAndProcess();
  }, [profile]);

  const processFiles = useCallback((acceptedFiles: File[]) => {
    // Check file size limits based on subscription tier
    const maxSize = profile?.subscription_tier
      ? FILE_UPLOAD.maxSize[profile.subscription_tier]
      : FILE_UPLOAD.maxSize.free;

    const validFiles = acceptedFiles.filter(file => {
      if (file.size > maxSize) {
        toast.error(`File ${file.name} is too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`);
        return false;
      }
      return true;
    });

    const newFiles: UploadFile[] = validFiles.map(file => ({
      file,
      id: crypto.randomUUID(),
      progress: 0,
      status: 'pending'
    }));

    setUploadFiles(prev => [...prev, ...newFiles].slice(0, maxFiles));
  }, [profile, maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxFiles,
    disabled: isUploading || isCheckingLimits || authLoading
  });

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFileType = (id: string, documentType: string) => {
    setUploadFiles(prev => prev.map(f => 
      f.id === id ? { ...f, documentType } : f
    ));
  };

  const handleUploadFiles = async () => {
    if (uploadFiles.length === 0) return;

    setIsUploading(true);

    for (const uploadFile of uploadFiles) {
      if (uploadFile.status !== 'pending' || !uploadFile.documentType) continue;

      try {
        // Stage 1: Upload the file
        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? {
            ...f,
            status: 'uploading',
            progress: 0,
            processingMessage: 'Uploading file...'
          } : f
        ));

        const document = await documentsApi.uploadDocument(uploadFile.file, uploadFile.documentType);

        // Increment usage counter with new tracking service (optional)
        try {
          const { usageTrackingService } = await import('@/lib/services/usageTracking');
          await usageTrackingService.incrementUsage('document_upload', document.id, {
            filename: uploadFile.file.name,
            file_size: uploadFile.file.size,
            document_type: uploadFile.documentType
          });
        } catch (usageError) {
          console.warn('Usage tracking increment failed:', usageError);
          // Continue with processing even if usage tracking fails
        }

        // Stage 2: Start AI processing
        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? {
            ...f,
            status: 'processing',
            progress: 20,
            documentId: document.id,
            processingMessage: 'Starting AI processing...'
          } : f
        ));

        // Trigger real-time simulation for development
        if (import.meta.env.DEV) {
          simulateDocumentProcessing(document.id);
        }

        // Send real-time update
        realtimeService.sendDocumentProcessingUpdate({
          documentId: document.id,
          status: 'processing',
          progress: 20,
          message: 'Starting AI processing...'
        });

        // Process the document with AI
        await processDocument(uploadFile.file, document.id, (processingStatus) => {
          setUploadFiles(prev => prev.map(f => {
            if (f.id === uploadFile.id) {
              return {
                ...f,
                progress: 20 + (processingStatus.progress * 0.8), // Upload was 20%, processing is 80%
                processingStage: processingStatus.stage,
                processingMessage: processingStatus.message
              };
            }
            return f;
          }));

          // Send real-time update for each processing stage
          realtimeService.sendDocumentProcessingUpdate({
            documentId: document.id,
            status: 'processing',
            progress: 20 + (processingStatus.progress * 0.8),
            message: processingStatus.message,
            stage: processingStatus.stage
          });
        });

        // Mark as completed
        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? {
            ...f,
            status: 'completed',
            progress: 100,
            processingMessage: 'Processing completed!'
          } : f
        ));

        // Send completion update
        realtimeService.sendDocumentProcessingUpdate({
          documentId: document.id,
          status: 'completed',
          progress: 100,
          message: 'Document processing completed successfully!'
        });

        toast.success(`${uploadFile.file.name} uploaded and processed successfully`);

        if (onUploadComplete) {
          onUploadComplete(document.id);
        }

      } catch (error: any) {
        console.error('Upload/processing error:', error);

        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? {
            ...f,
            status: 'error',
            error: error.message ?? 'Upload or processing failed',
            processingMessage: 'Failed'
          } : f
        ));

        // Send error update if document was created
        const failedFile = uploadFiles.find(f => f.id === uploadFile.id);
        if (failedFile?.documentId) {
          realtimeService.sendDocumentProcessingUpdate({
            documentId: failedFile.documentId,
            status: 'failed',
            progress: 0,
            message: 'Document processing failed',
            error: error.message ?? 'Upload or processing failed'
          });
        }

        toast.error(`Failed to process ${uploadFile.file.name}: ${error.message}`);
      }
    }

    setIsUploading(false);
  };

  const canUpload = uploadFiles.some(f => f.status === 'pending' && f.documentType);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Documents</CardTitle>
        <CardDescription>
          Upload your legal documents for AI-powered analysis and processing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${(isUploading || isCheckingLimits || authLoading || !profile) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />

          {authLoading ? (
            <div>
              <p className="text-gray-600 mb-2">Loading user profile...</p>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : isCheckingLimits ? (
            <div>
              <p className="text-gray-600 mb-2">Checking upload limits...</p>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : isDragActive ? (
            <p className="text-blue-600">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">
                Drag & drop files here, or click to select files
              </p>
              <p className="text-sm text-gray-500">
                Supports PDF, DOC, DOCX, TXT files up to{' '}
                {Math.round((profile?.subscription_tier
                  ? FILE_UPLOAD.maxSize[profile.subscription_tier]
                  : FILE_UPLOAD.maxSize.free) / 1024 / 1024)}MB
              </p>
            </div>
          )}
        </div>

        {/* File List */}
        {uploadFiles.length > 0 && (
          <div className="space-y-3">
            {uploadFiles.map((uploadFile) => (
              <div key={uploadFile.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">{uploadFile.file.name}</span>
                    <span className="text-xs text-gray-500">
                      ({Math.round(uploadFile.file.size / 1024)} KB)
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {uploadFile.status === 'completed' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {uploadFile.status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    {uploadFile.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(uploadFile.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {uploadFile.status === 'pending' && (
                  <div className="mb-2">
                    <Select
                      value={uploadFile.documentType || ''}
                      onValueChange={(value) => updateFileType(uploadFile.id, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{uploadFile.processingMessage || 'Processing...'}</span>
                      <span>{Math.round(uploadFile.progress)}%</span>
                    </div>
                    <Progress value={uploadFile.progress} className="w-full" />
                    {uploadFile.processingStage && (
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        {uploadFile.processingStage === 'ocr' && <Eye className="h-3 w-3" />}
                        {uploadFile.processingStage === 'analysis' && <Brain className="h-3 w-3" />}
                        {uploadFile.processingStage === 'embedding' && <Zap className="h-3 w-3" />}
                        <span className="capitalize">{uploadFile.processingStage} processing</span>
                      </div>
                    )}
                  </div>
                )}

                {uploadFile.status === 'error' && uploadFile.error && (
                  <Alert variant="destructive">
                    <AlertDescription>{uploadFile.error}</AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        {uploadFiles.length > 0 && (
          <Button
            onClick={handleUploadFiles}
            disabled={!canUpload || isUploading}
            className="w-full"
          >
            {isUploading ? 'Uploading...' : `Upload ${uploadFiles.filter(f => f.status === 'pending').length} Files`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
