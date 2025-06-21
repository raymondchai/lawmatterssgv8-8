import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Highlighter,
  MessageSquare,
  StickyNote,
  Palette,
  Save,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAnnotations } from '@/hooks/useAnnotations';
import { useAuth } from '@/contexts/AuthContext';
import { useDocumentCollaboration } from '@/hooks/useRealTime';
import { ConnectionStatus } from '@/components/realtime/ConnectionStatus';
import type { DocumentAnnotation } from '@/lib/api/annotations';
import { formatDistanceToNow } from 'date-fns';

// Use the DocumentAnnotation type from the API
type Annotation = DocumentAnnotation;

interface EnhancedPDFViewerProps {
  documentUrl: string;
  documentId: string;
  className?: string;
  onAnnotationChange?: (annotations: Annotation[]) => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#FFEB3B', bg: 'rgba(255, 235, 59, 0.3)' },
  { name: 'Green', value: '#4CAF50', bg: 'rgba(76, 175, 80, 0.3)' },
  { name: 'Blue', value: '#2196F3', bg: 'rgba(33, 150, 243, 0.3)' },
  { name: 'Red', value: '#F44336', bg: 'rgba(244, 67, 54, 0.3)' },
  { name: 'Purple', value: '#9C27B0', bg: 'rgba(156, 39, 176, 0.3)' },
  { name: 'Orange', value: '#FF9800', bg: 'rgba(255, 152, 0, 0.3)' }
];

export const EnhancedPDFViewer: React.FC<EnhancedPDFViewerProps> = ({
  documentUrl,
  documentId,
  className = '',
  onAnnotationChange
}) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<'select' | 'highlight' | 'note' | 'sticky'>('select');
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0]);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [currentSelection, setCurrentSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [newAnnotationContent, setNewAnnotationContent] = useState('');

  const viewerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Use the annotations hook for database-backed annotations
  const {
    annotations,
    loading: annotationsLoading,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    createReply
  } = useAnnotations(documentId);

  const { user } = useAuth();

  // Real-time collaboration features
  const {
    processingStatus,
    presenceData,
    updateCurrentPage,
    isConnected
  } = useDocumentCollaboration(documentId);

  // Notify parent component when annotations change
  useEffect(() => {
    onAnnotationChange?.(annotations);
  }, [annotations, onAnnotationChange]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (selectedTool === 'select') return;

    const rect = viewerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectedTool === 'highlight') {
      setIsSelecting(true);
      setSelectionStart({ x, y });
      setCurrentSelection({ x, y, width: 0, height: 0 });
    } else if (selectedTool === 'note' || selectedTool === 'sticky') {
      // Create annotation at click position
      handleCreateAnnotation(x, y);
    }
  }, [selectedTool]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !selectionStart || selectedTool !== 'highlight') return;

    const rect = viewerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentSelection({
      x: Math.min(selectionStart.x, x),
      y: Math.min(selectionStart.y, y),
      width: Math.abs(x - selectionStart.x),
      height: Math.abs(y - selectionStart.y)
    });
  }, [isSelecting, selectionStart, selectedTool]);

  const handleMouseUp = useCallback(() => {
    if (isSelecting && currentSelection && selectedTool === 'highlight') {
      if (currentSelection.width > 10 && currentSelection.height > 10) {
        handleCreateHighlight(currentSelection);
      }
    }
    setIsSelecting(false);
    setSelectionStart(null);
    setCurrentSelection(null);
  }, [isSelecting, currentSelection, selectedTool]);

  const handleCreateAnnotation = async (x: number, y: number) => {
    if (!user) {
      toast.error('Please log in to create annotations');
      return;
    }

    const newAnnotation = await createAnnotation({
      type: selectedTool as 'note' | 'sticky',
      page_number: 1, // For now, assume single page
      position: { x, y },
      content: '',
      color: selectedColor.value
    });

    if (newAnnotation) {
      setEditingAnnotation(newAnnotation.id);
      setNewAnnotationContent('');
    }
  };

  const handleCreateHighlight = async (selection: { x: number; y: number; width: number; height: number }) => {
    if (!user) {
      toast.error('Please log in to create highlights');
      return;
    }

    await createAnnotation({
      type: 'highlight',
      page_number: 1,
      position: selection,
      content: 'Highlighted text',
      color: selectedColor.value
    });
  };

  const handleUpdateAnnotation = async (id: string, content: string) => {
    const success = await updateAnnotation(id, { content });
    if (success) {
      setEditingAnnotation(null);
      setNewAnnotationContent('');
    }
  };

  const handleDeleteAnnotation = async (id: string) => {
    await deleteAnnotation(id);
  };

  const containerClass = isFullscreen 
    ? 'fixed inset-0 z-50 bg-white' 
    : className;

  return (
    <Card className={containerClass}>
      {/* Toolbar */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <div className="flex items-center space-x-1 border rounded-md">
              <Button variant="ghost" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm font-medium">{zoom}%</span>
              <Button variant="ghost" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Annotation Tools */}
            <div className="flex items-center space-x-1">
              <Button
                variant={selectedTool === 'select' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedTool('select')}
              >
                Select
              </Button>
              <Button
                variant={selectedTool === 'highlight' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedTool('highlight')}
              >
                <Highlighter className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedTool === 'note' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedTool('note')}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedTool === 'sticky' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedTool('sticky')}
              >
                <StickyNote className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Color Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Palette className="h-4 w-4 mr-2" />
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: selectedColor.value }}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="grid grid-cols-3 gap-2">
                  {HIGHLIGHT_COLORS.map((color) => (
                    <Button
                      key={color.value}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      style={{ backgroundColor: color.value }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAnnotations(!showAnnotations)}
            >
              {showAnnotations ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>

            {/* Real-time Status and Collaboration */}
            <ConnectionStatus
              documentId={documentId}
              showUserPresence={true}
              className="ml-auto"
            />
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <CardContent className="p-0 relative">
        <div
          ref={viewerRef}
          className="relative overflow-auto"
          style={{ height: isFullscreen ? 'calc(100vh - 120px)' : '600px' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <div
            className="relative"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'top left',
              cursor: selectedTool === 'select' ? 'default' : 'crosshair'
            }}
          >
            <iframe
              ref={iframeRef}
              src={`${documentUrl}#toolbar=0&navpanes=0&scrollbar=0`}
              className="w-full h-[800px] border-0"
              title="PDF Document"
            />

            {/* Annotations Overlay */}
            {showAnnotations && (
              <div className="absolute inset-0 pointer-events-none">
                {annotations.map((annotation) => (
                  <div
                    key={annotation.id}
                    className="absolute pointer-events-auto"
                    style={{
                      left: annotation.position.x,
                      top: annotation.position.y,
                      width: annotation.position.width,
                      height: annotation.position.height,
                      backgroundColor: annotation.type === 'highlight' 
                        ? HIGHLIGHT_COLORS.find(c => c.value === annotation.color)?.bg 
                        : 'transparent'
                    }}
                  >
                    {annotation.type !== 'highlight' && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 rounded-full"
                            style={{ backgroundColor: annotation.color }}
                          >
                            {annotation.type === 'note' ? (
                              <MessageSquare className="h-3 w-3" />
                            ) : (
                              <StickyNote className="h-3 w-3" />
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-3">
                            {/* Header with user info and actions */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={annotation.user?.avatar_url} />
                                  <AvatarFallback className="text-xs">
                                    {annotation.user?.first_name?.[0]}{annotation.user?.last_name?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">
                                    {annotation.user?.first_name} {annotation.user?.last_name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDistanceToNow(new Date(annotation.created_at), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Badge variant="outline" className="text-xs">{annotation.type}</Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteAnnotation(annotation.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {editingAnnotation === annotation.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={newAnnotationContent}
                                  onChange={(e) => setNewAnnotationContent(e.target.value)}
                                  placeholder="Enter annotation content..."
                                  className="min-h-[80px]"
                                />
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateAnnotation(annotation.id, newAnnotationContent)}
                                  >
                                    <Save className="h-4 w-4 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingAnnotation(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-sm">{annotation.content || 'No content'}</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingAnnotation(annotation.id);
                                    setNewAnnotationContent(annotation.content);
                                  }}
                                >
                                  Edit
                                </Button>
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                ))}

                {/* Current Selection */}
                {currentSelection && isSelecting && (
                  <div
                    className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30 pointer-events-none"
                    style={{
                      left: currentSelection.x,
                      top: currentSelection.y,
                      width: currentSelection.width,
                      height: currentSelection.height
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
