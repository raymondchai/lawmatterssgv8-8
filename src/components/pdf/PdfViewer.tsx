/**
 * PDF Viewer with Annotations Support
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  MessageSquare,
  Edit3,
  Stamp,
  Palette
} from 'lucide-react';
import { AnnotationLayer } from './AnnotationLayer';
import { AnnotationToolbar } from './AnnotationToolbar';
import { AnnotationSidebar } from './AnnotationSidebar';
import { useDocumentAnnotations, useAnnotationState } from '@/hooks/useAnnotations';
import type { PdfAnnotation, AnnotationType, AnnotationColor } from '@/types/annotations';
import { cn } from '@/lib/utils';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PdfViewerProps {
  documentId: string;
  fileUrl: string;
  className?: string;
  showAnnotations?: boolean;
  readOnly?: boolean;
  onAnnotationCreate?: (annotation: PdfAnnotation) => void;
  onAnnotationUpdate?: (annotation: PdfAnnotation) => void;
  onAnnotationDelete?: (annotationId: string) => void;
}

export function PdfViewer({
  documentId,
  fileUrl,
  className,
  showAnnotations = true,
  readOnly = false,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete
}: PdfViewerProps) {
  // PDF state
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Hooks
  const { annotations, isLoading: annotationsLoading, createAnnotation, updateAnnotation, deleteAnnotation } = 
    useDocumentAnnotations(documentId);
  
  const {
    selectedAnnotation,
    activeTool,
    drawingState,
    selectAnnotation,
    activateTool,
    deactivateTool,
    startDrawing,
    updateDrawingPath,
    stopDrawing
  } = useAnnotationState();

  // PDF event handlers
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    setError(`Failed to load PDF: ${error.message}`);
    setIsLoading(false);
  }, []);

  // Navigation handlers
  const goToPreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(numPages, prev + 1));
  }, [numPages]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(numPages, page)));
  }, [numPages]);

  // Zoom handlers
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(3.0, prev + 0.25));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(0.5, prev - 0.25));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1.0);
  }, []);

  // Rotation handler
  const rotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  // Fullscreen handlers
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Annotation handlers
  const handleAnnotationCreate = useCallback(async (annotationData: any) => {
    try {
      const newAnnotation = await createAnnotation({
        documentId,
        pageNumber: currentPage,
        ...annotationData
      });
      onAnnotationCreate?.(newAnnotation);
    } catch (error) {
      console.error('Failed to create annotation:', error);
    }
  }, [createAnnotation, documentId, currentPage, onAnnotationCreate]);

  const handleAnnotationUpdate = useCallback(async (annotationId: string, updates: any) => {
    try {
      const updatedAnnotation = await updateAnnotation(annotationId, updates);
      onAnnotationUpdate?.(updatedAnnotation);
    } catch (error) {
      console.error('Failed to update annotation:', error);
    }
  }, [updateAnnotation, onAnnotationUpdate]);

  const handleAnnotationDelete = useCallback(async (annotationId: string) => {
    try {
      await deleteAnnotation(annotationId);
      onAnnotationDelete?.(annotationId);
    } catch (error) {
      console.error('Failed to delete annotation:', error);
    }
  }, [deleteAnnotation, onAnnotationDelete]);

  // Get current page annotations
  const currentPageAnnotations = annotations.filter(
    annotation => annotation.pageNumber === currentPage
  );

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex h-full bg-gray-50",
        isFullscreen && "fixed inset-0 z-50 bg-black",
        className
      )}
    >
      {/* Main PDF Viewer */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Navigation */}
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm font-medium">
              Page {currentPage} of {numPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage >= numPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Zoom controls */}
            <Button variant="outline" size="sm" onClick={zoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <span className="text-sm font-medium min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            
            <Button variant="outline" size="sm" onClick={zoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={rotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Annotation tools */}
            {showAnnotations && !readOnly && (
              <AnnotationToolbar
                activeTool={activeTool}
                onToolSelect={activateTool}
                onToolDeselect={deactivateTool}
              />
            )}

            <Separator orientation="vertical" className="h-6" />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              Annotations ({currentPageAnnotations.length})
            </Button>

            <Button variant="outline" size="sm" onClick={toggleFullscreen}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div className="flex justify-center">
            <div 
              ref={pageRef}
              className="relative bg-white shadow-lg"
              style={{
                transform: `rotate(${rotation}deg)`,
              }}
            >
              <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                }
              >
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
                
                {/* Custom Annotation Layer */}
                {showAnnotations && (
                  <AnnotationLayer
                    annotations={currentPageAnnotations}
                    scale={scale}
                    rotation={rotation}
                    activeTool={activeTool}
                    selectedAnnotation={selectedAnnotation}
                    drawingState={drawingState}
                    readOnly={readOnly}
                    onAnnotationCreate={handleAnnotationCreate}
                    onAnnotationSelect={selectAnnotation}
                    onAnnotationUpdate={handleAnnotationUpdate}
                    onAnnotationDelete={handleAnnotationDelete}
                    onDrawingStart={startDrawing}
                    onDrawingUpdate={updateDrawingPath}
                    onDrawingEnd={stopDrawing}
                  />
                )}
              </Document>
            </div>
          </div>
        </div>
      </div>

      {/* Annotations Sidebar */}
      {showAnnotations && showSidebar && (
        <AnnotationSidebar
          annotations={annotations}
          currentPage={currentPage}
          selectedAnnotation={selectedAnnotation}
          onAnnotationSelect={selectAnnotation}
          onAnnotationUpdate={handleAnnotationUpdate}
          onAnnotationDelete={handleAnnotationDelete}
          onPageChange={goToPage}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
