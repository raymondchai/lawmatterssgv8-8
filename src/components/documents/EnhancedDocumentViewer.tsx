/**
 * Enhanced Document Viewer with PDF Annotations Support
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FileText,
  Download,
  Share2,
  Eye,
  MessageSquare,
  Highlighter,
  Settings,
  ExternalLink,
  Clock,
  User,
  FileType,
  HardDrive
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { PdfViewer } from '@/components/pdf/PdfViewer';
import { useDocumentAnnotations } from '@/hooks/useAnnotations';
import type { UploadedDocument } from '@/types/documents';
import type { PdfAnnotation } from '@/types/annotations';
import { cn } from '@/lib/utils';

interface EnhancedDocumentViewerProps {
  document: UploadedDocument;
  className?: string;
  readOnly?: boolean;
  showMetadata?: boolean;
  showAnnotations?: boolean;
  onDocumentUpdate?: (document: UploadedDocument) => void;
}

export function EnhancedDocumentViewer({
  document,
  className,
  readOnly = false,
  showMetadata = true,
  showAnnotations = true,
  onDocumentUpdate
}: EnhancedDocumentViewerProps) {
  const [activeTab, setActiveTab] = useState('viewer');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { annotations, isLoading: annotationsLoading } = useDocumentAnnotations(document.id);

  // Check if document is PDF
  const isPdf = document.fileType === 'application/pdf' || document.fileName.toLowerCase().endsWith('.pdf');

  const handleAnnotationCreate = (annotation: PdfAnnotation) => {
    console.log('Annotation created:', annotation);
    // Handle annotation creation if needed
  };

  const handleAnnotationUpdate = (annotation: PdfAnnotation) => {
    console.log('Annotation updated:', annotation);
    // Handle annotation update if needed
  };

  const handleAnnotationDelete = (annotationId: string) => {
    console.log('Annotation deleted:', annotationId);
    // Handle annotation deletion if needed
  };

  const handleDownload = () => {
    if (document.fileUrl) {
      const link = document.createElement('a');
      link.href = document.fileUrl;
      link.download = document.fileName;
      link.click();
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: document.fileName,
        text: `Check out this document: ${document.fileName}`,
        url: document.fileUrl
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(document.fileUrl || '');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('text')) return '📝';
    if (fileType.includes('word')) return '📘';
    if (fileType.includes('excel')) return '📊';
    if (fileType.includes('powerpoint')) return '📈';
    return '📁';
  };

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getFileTypeIcon(document.fileType)}</div>
            <div>
              <h1 className="text-xl font-semibold">{document.fileName}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className="flex items-center space-x-1">
                  <HardDrive className="h-4 w-4" />
                  <span>{formatFileSize(document.fileSize)}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDistanceToNow(new Date(document.uploadedAt), { addSuffix: true })}</span>
                </span>
                {showAnnotations && annotations.length > 0 && (
                  <span className="flex items-center space-x-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>{annotations.length} annotation(s)</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            {isPdf && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(true)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Fullscreen
              </Button>
            )}
          </div>
        </div>

        {/* Status and Processing Info */}
        <div className="flex items-center space-x-4 mt-3">
          <Badge variant={document.processingStatus === 'completed' ? 'default' : 'secondary'}>
            {document.processingStatus}
          </Badge>
          
          {document.ocrText && (
            <Badge variant="outline">
              <Eye className="h-3 w-3 mr-1" />
              OCR Processed
            </Badge>
          )}
          
          {document.embeddings && (
            <Badge variant="outline">
              <Highlighter className="h-3 w-3 mr-1" />
              Searchable
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="viewer">
              <FileText className="h-4 w-4 mr-2" />
              Viewer
            </TabsTrigger>
            {showMetadata && (
              <TabsTrigger value="metadata">
                <Settings className="h-4 w-4 mr-2" />
                Metadata
              </TabsTrigger>
            )}
            {showAnnotations && (
              <TabsTrigger value="annotations">
                <MessageSquare className="h-4 w-4 mr-2" />
                Annotations ({annotations.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="viewer" className="flex-1 overflow-hidden">
            {isPdf ? (
              <PdfViewer
                documentId={document.id}
                fileUrl={document.fileUrl}
                showAnnotations={showAnnotations}
                readOnly={readOnly}
                onAnnotationCreate={handleAnnotationCreate}
                onAnnotationUpdate={handleAnnotationUpdate}
                onAnnotationDelete={handleAnnotationDelete}
                className="h-full"
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50">
                <Card className="max-w-md">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-4">{getFileTypeIcon(document.fileType)}</div>
                    <h3 className="text-lg font-semibold mb-2">{document.fileName}</h3>
                    <p className="text-gray-600 mb-4">
                      This file type doesn't support inline viewing with annotations.
                    </p>
                    <Button onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {showMetadata && (
            <TabsContent value="metadata" className="flex-1 overflow-auto p-4">
              <div className="max-w-2xl mx-auto space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>File Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">File Name</label>
                        <p className="text-sm">{document.fileName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">File Type</label>
                        <p className="text-sm">{document.fileType}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">File Size</label>
                        <p className="text-sm">{formatFileSize(document.fileSize)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Uploaded</label>
                        <p className="text-sm">{format(new Date(document.uploadedAt), 'PPP')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Processing Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <Badge variant={document.processingStatus === 'completed' ? 'default' : 'secondary'}>
                          {document.processingStatus}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">OCR Processed</label>
                        <p className="text-sm">{document.ocrText ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Searchable</label>
                        <p className="text-sm">{document.embeddings ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Annotations</label>
                        <p className="text-sm">{annotations.length} annotation(s)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {document.ocrText && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Extracted Text (OCR)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-64 overflow-auto bg-gray-50 p-4 rounded text-sm">
                        {document.ocrText}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          )}

          {showAnnotations && (
            <TabsContent value="annotations" className="flex-1 overflow-auto p-4">
              <div className="max-w-2xl mx-auto">
                {annotationsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading annotations...</p>
                  </div>
                ) : annotations.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No annotations yet</h3>
                    <p className="text-gray-500">
                      {isPdf 
                        ? "Switch to the viewer tab to start adding annotations to this PDF."
                        : "Annotations are only available for PDF documents."
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">All Annotations ({annotations.length})</h3>
                    {annotations.map((annotation) => (
                      <Card key={annotation.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">
                                {annotation.annotationType}
                              </Badge>
                              <Badge variant="outline">
                                Page {annotation.pageNumber}
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(annotation.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          
                          {annotation.selectedText && (
                            <div className="mb-2 p-2 bg-gray-50 rounded text-sm italic">
                              "{annotation.selectedText}"
                            </div>
                          )}
                          
                          {annotation.content && (
                            <p className="text-sm text-gray-700 mb-2">{annotation.content}</p>
                          )}
                          
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <User className="h-3 w-3" />
                            <span>
                              {annotation.user?.firstName} {annotation.user?.lastName}
                            </span>
                            {annotation.comments && annotation.comments.length > 0 && (
                              <>
                                <Separator orientation="vertical" className="h-3" />
                                <MessageSquare className="h-3 w-3" />
                                <span>{annotation.comments.length} comment(s)</span>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Fullscreen PDF Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full">
          <DialogHeader>
            <DialogTitle>{document.fileName}</DialogTitle>
          </DialogHeader>
          {isPdf && (
            <PdfViewer
              documentId={document.id}
              fileUrl={document.fileUrl}
              showAnnotations={showAnnotations}
              readOnly={readOnly}
              onAnnotationCreate={handleAnnotationCreate}
              onAnnotationUpdate={handleAnnotationUpdate}
              onAnnotationDelete={handleAnnotationDelete}
              className="h-full"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
