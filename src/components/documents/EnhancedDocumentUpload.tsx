import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Brain, 
  Eye, 
  Zap,
  Settings,
  Clock
} from 'lucide-react';
import { useDocumentUpload } from '@/hooks/useDocumentProcessing';
import { useFeatureAvailability } from '@/hooks/useUsageTracking';
import { DOCUMENT_TYPES, FILE_UPLOAD } from '@/lib/config/constants';
import { useAuth } from '@/contexts/AuthContext';
import type { DocumentProcessingOptions } from '@/lib/services/enhancedDocumentProcessor';

interface UploadFile {
  file: File;
  id: string;
  documentType: string;
  options: DocumentProcessingOptions;
}

interface EnhancedDocumentUploadProps {
  onUploadComplete?: (documentId: string) => void;
  maxFiles?: number;
  allowedTypes?: string[];
}

const EnhancedDocumentUpload: React.FC<EnhancedDocumentUploadProps> = ({
  onUploadComplete,
  maxFiles = 5,
  allowedTypes = ['pdf', 'doc', 'docx', 'txt']
}) => {
  const { profile } = useAuth();
  const { uploadAndProcessDocument, uploadState, resetUploadState, isActive } = useDocumentUpload();
  const { canUploadDocuments, canUseAI, documentUsage } = useFeatureAvailability();
  
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [defaultOptions, setDefaultOptions] = useState<DocumentProcessingOptions>({
    skipOCR: false,
    skipAnalysis: false,
    skipEmbedding: false,
    chunkSize: 1000,
    retryAttempts: 3
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!canUploadDocuments) {
      toast.warning('Upload not available. Please check your subscription or try again later.');
      return;
    }

    // Check file size limits based on subscription tier
    const maxSize = profile?.subscription_tier 
      ? FILE_UPLOAD.maxSize[profile.subscription_tier]
      : FILE_UPLOAD.maxSize.free;

    const validFiles = acceptedFiles.filter(file => {
      if (file.size > maxSize) {
        return false;
      }
      return true;
    });

    const newFiles: UploadFile[] = validFiles.map(file => ({
      file,
      id: crypto.randomUUID(),
      documentType: 'other',
      options: { ...defaultOptions }
    }));

    setUploadFiles(prev => [...prev, ...newFiles].slice(0, maxFiles));
  }, [profile, maxFiles, canUploadDocuments, defaultOptions]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxFiles,
    disabled: isActive || !canUploadDocuments
  });

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFileType = (id: string, documentType: string) => {
    setUploadFiles(prev => prev.map(f => 
      f.id === id ? { ...f, documentType } : f
    ));
  };

  const updateFileOptions = (id: string, options: Partial<DocumentProcessingOptions>) => {
    setUploadFiles(prev => prev.map(f => 
      f.id === id ? { ...f, options: { ...f.options, ...options } } : f
    ));
  };

  const processFiles = async () => {
    for (const uploadFile of uploadFiles) {
      try {
        const result = await uploadAndProcessDocument(
          uploadFile.file,
          uploadFile.documentType,
          uploadFile.options
        );

        if (onUploadComplete) {
          onUploadComplete(result.document.id);
        }
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }

    // Clear files after processing
    setUploadFiles([]);
    resetUploadState();
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'ocr': return <Eye className="h-4 w-4" />;
      case 'analysis': return <Brain className="h-4 w-4" />;
      case 'embedding': return <Zap className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'completed': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'analysis': return 'text-blue-600';
      case 'embedding': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Enhanced Document Upload</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Advanced
          </Button>
        </CardTitle>
        <CardDescription>
          Upload and process your legal documents with AI-powered analysis
        </CardDescription>
        
        {/* Usage Information */}
        {documentUsage && (
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>
              Usage: {documentUsage.current}/{documentUsage.limit === -1 ? '∞' : documentUsage.limit} uploads
            </span>
            {documentUsage.limit > 0 && (
              <Progress 
                value={documentUsage.percentage} 
                className="w-24 h-2"
              />
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Advanced Options */}
        {showAdvancedOptions && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Processing Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="skip-ocr"
                    checked={!defaultOptions.skipOCR}
                    onCheckedChange={(checked) => 
                      setDefaultOptions(prev => ({ ...prev, skipOCR: !checked }))
                    }
                  />
                  <Label htmlFor="skip-ocr">Text Extraction</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="skip-analysis"
                    checked={!defaultOptions.skipAnalysis}
                    onCheckedChange={(checked) => 
                      setDefaultOptions(prev => ({ ...prev, skipAnalysis: !checked }))
                    }
                    disabled={!canUseAI}
                  />
                  <Label htmlFor="skip-analysis">AI Analysis</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="skip-embedding"
                    checked={!defaultOptions.skipEmbedding}
                    onCheckedChange={(checked) => 
                      setDefaultOptions(prev => ({ ...prev, skipEmbedding: !checked }))
                    }
                    disabled={!canUseAI}
                  />
                  <Label htmlFor="skip-embedding">Search Indexing</Label>
                </div>
              </div>
              
              {defaultOptions.customAnalysisPrompt !== undefined && (
                <div>
                  <Label htmlFor="custom-prompt">Custom Analysis Prompt</Label>
                  <Textarea
                    id="custom-prompt"
                    placeholder="Enter custom instructions for AI analysis..."
                    value={defaultOptions.customAnalysisPrompt || ''}
                    onChange={(e) => 
                      setDefaultOptions(prev => ({ 
                        ...prev, 
                        customAnalysisPrompt: e.target.value 
                      }))
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          } ${isActive || !canUploadDocuments ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-blue-600">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">
                {canUploadDocuments 
                  ? 'Drag & drop files here, or click to select'
                  : 'Upload limit reached for your subscription tier'
                }
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
            <h4 className="font-medium">Files to Upload</h4>
            {uploadFiles.map((uploadFile) => (
              <div key={uploadFile.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <FileText className="h-5 w-5 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                
                <Select
                  value={uploadFile.documentType}
                  onValueChange={(value) => updateFileType(uploadFile.id, value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(uploadFile.id)}
                  disabled={isActive}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Processing Status */}
        {isActive && uploadState.status && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={getStageColor(uploadState.status.stage)}>
                      {getStageIcon(uploadState.status.stage)}
                    </div>
                    <span className="font-medium capitalize">
                      {uploadState.status.stage.replace('_', ' ')}
                    </span>
                  </div>
                  <Badge variant="outline">
                    {Math.round(uploadState.progress)}%
                  </Badge>
                </div>
                
                <Progress value={uploadState.progress} className="w-full" />
                
                <p className="text-sm text-gray-600">
                  {uploadState.status.message}
                </p>
                
                {uploadState.status.details && (
                  <div className="text-xs text-gray-500 space-y-1">
                    {uploadState.status.details.ocrQuality && (
                      <p>OCR Quality: {Math.round(uploadState.status.details.ocrQuality * 100)}%</p>
                    )}
                    {uploadState.status.details.textLength && (
                      <p>Text Length: {uploadState.status.details.textLength.toLocaleString()} characters</p>
                    )}
                    {uploadState.status.details.embeddingChunks && (
                      <p>Embedding Chunks: {uploadState.status.details.embeddingChunks}</p>
                    )}
                  </div>
                )}
                
                {uploadState.error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {uploadState.error}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Button */}
        {uploadFiles.length > 0 && !isActive && (
          <Button 
            onClick={processFiles}
            className="w-full"
            disabled={!canUploadDocuments}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload and Process {uploadFiles.length} File{uploadFiles.length > 1 ? 's' : ''}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedDocumentUpload;
