import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, AlertCircle, X, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PublicDocumentUploadProps {
  onFileUpload: (file: File) => void;
  disabled?: boolean;
  maxFileSize?: number;
  allowedTypes?: string[];
}

export function PublicDocumentUpload({
  onFileUpload,
  disabled = false,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
}: PublicDocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds limit of ${Math.round(maxFileSize / (1024 * 1024))}MB`
      };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      const allowedExtensions = allowedTypes.map(type => {
        switch (type) {
          case 'application/pdf': return 'PDF';
          case 'image/jpeg': return 'JPEG';
          case 'image/png': return 'PNG';
          case 'image/webp': return 'WebP';
          default: return type;
        }
      }).join(', ');
      
      return {
        valid: false,
        error: `File type not supported. Allowed types: ${allowedExtensions}`
      };
    }

    return { valid: true };
  }, [maxFileSize, allowedTypes]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setUploadError(null);

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors?.[0]?.code === 'file-too-large') {
        setUploadError(`File size exceeds limit of ${Math.round(maxFileSize / (1024 * 1024))}MB`);
      } else if (rejection.errors?.[0]?.code === 'file-invalid-type') {
        setUploadError('File type not supported');
      } else {
        setUploadError('File upload failed');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const validation = validateFile(file);
      
      if (!validation.valid) {
        setUploadError(validation.error || 'File validation failed');
        return;
      }

      setSelectedFile(file);
      setUploadError(null);
    }
  }, [maxFileSize, validateFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxSize: maxFileSize,
    multiple: false,
    disabled
  });

  const handleUpload = () => {
    if (selectedFile) {
      onFileUpload(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadError(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else if (fileType.startsWith('image/')) {
      return <FileText className="h-8 w-8 text-blue-500" />;
    }
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card className={cn(
        "border-2 border-dashed transition-colors",
        isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300",
        disabled && "opacity-50 cursor-not-allowed"
      )}>
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={cn(
              "text-center cursor-pointer",
              disabled && "cursor-not-allowed"
            )}
          >
            <input {...getInputProps()} />
            
            <div className="space-y-4">
              <div className="flex justify-center">
                <Upload className={cn(
                  "h-12 w-12",
                  isDragActive ? "text-blue-500" : "text-gray-400"
                )} />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isDragActive ? "Drop your file here" : "Upload Document"}
                </h3>
                <p className="text-gray-600 mt-2">
                  Drag and drop your file here, or click to browse
                </p>
              </div>

              <div className="flex justify-center gap-2">
                <Badge variant="secondary">PDF</Badge>
                <Badge variant="secondary">JPEG</Badge>
                <Badge variant="secondary">PNG</Badge>
                <Badge variant="secondary">WebP</Badge>
              </div>

              <p className="text-sm text-gray-500">
                Maximum file size: {Math.round(maxFileSize / (1024 * 1024))}MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {uploadError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {uploadError}
          </AlertDescription>
        </Alert>
      )}

      {/* Selected File Display */}
      {selectedFile && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getFileIcon(selectedFile.type)}
                <div>
                  <h4 className="font-medium text-gray-900">{selectedFile.name}</h4>
                  <p className="text-sm text-gray-600">
                    {formatFileSize(selectedFile.size)} • {selectedFile.type}
                  </p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Button */}
      {selectedFile && (
        <div className="flex justify-center">
          <Button
            onClick={handleUpload}
            disabled={disabled}
            className="px-8 py-2 bg-blue-600 hover:bg-blue-700"
          >
            Analyze Document
          </Button>
        </div>
      )}

      {/* Guidelines */}
      <div className="text-sm text-gray-600 space-y-2">
        <h4 className="font-medium text-gray-900">Upload Guidelines:</h4>
        <ul className="space-y-1 list-disc list-inside">
          <li>Ensure document text is clear and readable</li>
          <li>For best results, use high-resolution scans</li>
          <li>Documents are automatically deleted after 24 hours</li>
          <li>No personal information is stored permanently</li>
        </ul>
      </div>
    </div>
  );
}
