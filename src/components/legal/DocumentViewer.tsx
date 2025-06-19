import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Download,
  Share2,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  X,
  Loader2,
  AlertCircle,
  Brain
} from 'lucide-react';
import { documentsApi } from '@/lib/api/documents';
import { DocumentAnalysisComponent } from './DocumentAnalysis';
import { DOCUMENT_TYPES, PROCESSING_STATUS } from '@/lib/config/constants';
import type { UploadedDocument } from '@/types';
import { toast } from '@/components/ui/sonner';
import { formatDistanceToNow } from 'date-fns';

interface DocumentViewerProps {
  documentId: string;
  onClose?: () => void;
  className?: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentId,
  onClose,
  className = ''
}) => {
  const [document, setDocument] = useState<UploadedDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState('viewer');

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      const doc = await documentsApi.getDocument(documentId);
      setDocument(doc);
    } catch (err: any) {
      console.error('Error loading document:', err);
      setError(err.message || 'Failed to load document');
      toast.error('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (document) {
      window.open(document.file_url, '_blank');
    }
  };

  const handleShare = async () => {
    if (document) {
      try {
        await navigator.share({
          title: document.filename,
          url: document.file_url,
        });
      } catch (err) {
        // Fallback to copying URL
        await navigator.clipboard.writeText(document.file_url);
        toast.success('Document URL copied to clipboard');
      }
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm text-gray-600">Loading document...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !document) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center space-y-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-red-600">{error || 'Document not found'}</p>
            <Button onClick={loadDocument} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const containerClass = isFullscreen 
    ? 'fixed inset-0 z-50 bg-white' 
    : `${className}`;

  return (
    <Card className={containerClass}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">
              {document.filename}
            </CardTitle>
            <CardDescription className="flex items-center space-x-4 mt-1">
              <span>{DOCUMENT_TYPES[document.document_type as keyof typeof DOCUMENT_TYPES]}</span>
              <span>{Math.round(document.file_size / 1024)} KB</span>
              <span>{formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}</span>
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              {getStatusIcon(document.processing_status)}
              <Badge className={getStatusColor(document.processing_status)}>
                {PROCESSING_STATUS[document.processing_status as keyof typeof PROCESSING_STATUS]}
              </Badge>
            </div>
            
            {onClose && (
              <Button onClick={onClose} variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <Separator />

      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Button onClick={handleZoomOut} variant="outline" size="sm">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center">
            {zoom}%
          </span>
          <Button onClick={handleZoomIn} variant="outline" size="sm">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button onClick={handleRotate} variant="outline" size="sm">
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button onClick={handleShare} variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button onClick={toggleFullscreen} variant="outline" size="sm">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Document Content with Tabs */}
      <CardContent className="p-0 flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b px-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="viewer" className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Document</span>
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Text</span>
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <span>AI Analysis</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="viewer" className="mt-0">
            <ScrollArea className={isFullscreen ? 'h-[calc(100vh-250px)]' : 'h-[550px]'}>
              <div className="p-4">
                {document.file_url.toLowerCase().endsWith('.pdf') ? (
                  <div
                    className="w-full border rounded-lg overflow-hidden"
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                      transformOrigin: 'top left'
                    }}
                  >
                    <iframe
                      src={`${document.file_url}#toolbar=0&navpanes=0&scrollbar=0`}
                      className="w-full h-[800px]"
                      title={document.filename}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Preview not available
                    </h3>
                    <p className="text-gray-500 mb-4">
                      This file type cannot be previewed in the browser.
                    </p>
                    <Button onClick={handleDownload}>
                      <Download className="mr-2 h-4 w-4" />
                      Download to view
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="text" className="mt-0">
            <ScrollArea className={isFullscreen ? 'h-[calc(100vh-250px)]' : 'h-[550px]'}>
              <div className="p-4">
                {document.ocr_text ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">
                        Extracted Text
                      </h4>
                      {document.ocr_quality_score && (
                        <Badge variant="outline">
                          Quality: {Math.round(document.ocr_quality_score * 100)}%
                        </Badge>
                      )}
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {document.ocr_text}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No text extracted
                    </h3>
                    <p className="text-gray-500">
                      Text extraction may still be in progress or the document may not contain readable text.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="analysis" className="mt-0">
            <ScrollArea className={isFullscreen ? 'h-[calc(100vh-250px)]' : 'h-[550px]'}>
              <div className="p-4">
                <DocumentAnalysisComponent document={document} />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
