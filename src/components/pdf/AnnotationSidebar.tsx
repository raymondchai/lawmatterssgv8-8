/**
 * Annotation Sidebar Component
 * Displays and manages annotations for the current document
 */

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  Edit3,
  Trash2,
  Share2,
  MoreVertical,
  Filter,
  Search,
  Calendar,
  User,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type {
  PdfAnnotation,
  AnnotationSelection,
  AnnotationType,
  AnnotationColor
} from '@/types/annotations';
import { useAnnotationComments, useAnnotationSharing } from '@/hooks/useAnnotations';
import { cn } from '@/lib/utils';

interface AnnotationSidebarProps {
  annotations: PdfAnnotation[];
  currentPage: number;
  selectedAnnotation: AnnotationSelection;
  onAnnotationSelect: (annotation: PdfAnnotation | null, isEditing?: boolean) => void;
  onAnnotationUpdate: (annotationId: string, updates: any) => void;
  onAnnotationDelete: (annotationId: string) => void;
  onPageChange: (page: number) => void;
  readOnly?: boolean;
  className?: string;
}

const annotationTypeLabels: Record<AnnotationType, string> = {
  highlight: 'Highlight',
  note: 'Note',
  text: 'Text',
  drawing: 'Drawing',
  stamp: 'Stamp'
};

const annotationColorLabels: Record<AnnotationColor, string> = {
  yellow: 'Yellow',
  red: 'Red',
  blue: 'Blue',
  green: 'Green',
  purple: 'Purple',
  orange: 'Orange',
  pink: 'Pink',
  gray: 'Gray'
};

export function AnnotationSidebar({
  annotations,
  currentPage,
  selectedAnnotation,
  onAnnotationSelect,
  onAnnotationUpdate,
  onAnnotationDelete,
  onPageChange,
  readOnly = false,
  className
}: AnnotationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<AnnotationType | 'all'>('all');
  const [filterColor, setFilterColor] = useState<AnnotationColor | 'all'>('all');
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');

  const { addComment } = useAnnotationComments(selectedAnnotation.annotation?.id || '');
  const { shareAnnotation } = useAnnotationSharing();

  // Filter and search annotations
  const filteredAnnotations = useMemo(() => {
    return annotations.filter(annotation => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesContent = annotation.content?.toLowerCase().includes(searchLower);
        const matchesSelectedText = annotation.selectedText?.toLowerCase().includes(searchLower);
        const matchesUser = annotation.user?.email?.toLowerCase().includes(searchLower);
        
        if (!matchesContent && !matchesSelectedText && !matchesUser) {
          return false;
        }
      }

      // Type filter
      if (filterType !== 'all' && annotation.annotationType !== filterType) {
        return false;
      }

      // Color filter
      if (filterColor !== 'all' && annotation.color !== filterColor) {
        return false;
      }

      return true;
    });
  }, [annotations, searchQuery, filterType, filterColor]);

  // Group annotations by page
  const annotationsByPage = useMemo(() => {
    const grouped: Record<number, PdfAnnotation[]> = {};
    filteredAnnotations.forEach(annotation => {
      if (!grouped[annotation.pageNumber]) {
        grouped[annotation.pageNumber] = [];
      }
      grouped[annotation.pageNumber].push(annotation);
    });
    return grouped;
  }, [filteredAnnotations]);

  const handleEditStart = (annotation: PdfAnnotation) => {
    setEditingAnnotation(annotation.id);
    setEditContent(annotation.content || '');
  };

  const handleEditSave = async (annotationId: string) => {
    await onAnnotationUpdate(annotationId, { content: editContent });
    setEditingAnnotation(null);
    setEditContent('');
  };

  const handleEditCancel = () => {
    setEditingAnnotation(null);
    setEditContent('');
  };

  const handleShare = async (annotation: PdfAnnotation) => {
    if (!shareEmail) return;
    
    try {
      await shareAnnotation({
        annotationId: annotation.id,
        userEmail: shareEmail,
        permissionLevel: 'view'
      });
      setShareDialogOpen(false);
      setShareEmail('');
    } catch (error) {
      console.error('Failed to share annotation:', error);
    }
  };

  const handleAddComment = async (annotationId: string, content: string) => {
    try {
      await addComment({
        annotationId,
        content
      });
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const renderAnnotationItem = (annotation: PdfAnnotation) => {
    const isSelected = selectedAnnotation.annotation?.id === annotation.id;
    const isEditing = editingAnnotation === annotation.id;

    return (
      <Card
        key={annotation.id}
        className={cn(
          "mb-3 cursor-pointer transition-all",
          isSelected && "ring-2 ring-blue-500"
        )}
        onClick={() => onAnnotationSelect(annotation)}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {annotationTypeLabels[annotation.annotationType]}
              </Badge>
              <div
                className="w-3 h-3 rounded-full border"
                style={{ backgroundColor: annotation.color }}
                title={annotationColorLabels[annotation.color]}
              />
            </div>
            
            {!readOnly && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditStart(annotation)}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onAnnotationDelete(annotation.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Selected text */}
          {annotation.selectedText && (
            <div className="mb-2 p-2 bg-gray-50 rounded text-sm italic">
              "{annotation.selectedText}"
            </div>
          )}

          {/* Content */}
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Add your note..."
                className="min-h-[60px]"
              />
              <div className="flex space-x-2">
                <Button size="sm" onClick={() => handleEditSave(annotation.id)}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleEditCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            annotation.content && (
              <p className="text-sm text-gray-700 mb-2">{annotation.content}</p>
            )
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              <User className="h-3 w-3" />
              <span>
                {annotation.user?.firstName} {annotation.user?.lastName}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(annotation.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Comments */}
          {annotation.comments && annotation.comments.length > 0 && (
            <div className="mt-2 pt-2 border-t">
              <div className="flex items-center space-x-1 text-xs text-gray-500 mb-1">
                <MessageSquare className="h-3 w-3" />
                <span>{annotation.comments.length} comment(s)</span>
              </div>
              {annotation.comments.slice(0, 2).map(comment => (
                <div key={comment.id} className="text-xs bg-gray-50 p-2 rounded mb-1">
                  <p>{comment.content}</p>
                  <span className="text-gray-400">
                    by {comment.user?.firstName} {comment.user?.lastName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={cn("w-80 bg-white border-l flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-semibold mb-3">Annotations ({filteredAnnotations.length})</h3>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search annotations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <Filter className="h-4 w-4 mr-1" />
                {filterType === 'all' ? 'All Types' : annotationTypeLabels[filterType]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterType('all')}>
                All Types
              </DropdownMenuItem>
              {Object.entries(annotationTypeLabels).map(([type, label]) => (
                <DropdownMenuItem
                  key={type}
                  onClick={() => setFilterType(type as AnnotationType)}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <div className="flex items-center space-x-1">
                  <div
                    className="w-3 h-3 rounded-full border"
                    style={{ 
                      backgroundColor: filterColor === 'all' ? 'transparent' : filterColor 
                    }}
                  />
                  <span>{filterColor === 'all' ? 'All Colors' : annotationColorLabels[filterColor]}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterColor('all')}>
                All Colors
              </DropdownMenuItem>
              {Object.entries(annotationColorLabels).map(([color, label]) => (
                <DropdownMenuItem
                  key={color}
                  onClick={() => setFilterColor(color as AnnotationColor)}
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full border"
                      style={{ backgroundColor: color }}
                    />
                    <span>{label}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Annotations List */}
      <ScrollArea className="flex-1 p-4">
        {Object.keys(annotationsByPage).length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No annotations found</p>
            <p className="text-sm">Start by selecting an annotation tool</p>
          </div>
        ) : (
          Object.entries(annotationsByPage)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([pageNum, pageAnnotations]) => (
              <div key={pageNum} className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm text-gray-700">
                    Page {pageNum} ({pageAnnotations.length})
                  </h4>
                  {parseInt(pageNum) !== currentPage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onPageChange(parseInt(pageNum))}
                      className="h-6 px-2 text-xs"
                    >
                      Go to page
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
                {pageAnnotations.map(renderAnnotationItem)}
              </div>
            ))
        )}
      </ScrollArea>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Annotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter email address"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
            />
            <div className="flex space-x-2">
              <Button 
                onClick={() => selectedAnnotation.annotation && handleShare(selectedAnnotation.annotation)}
                disabled={!shareEmail}
              >
                Share
              </Button>
              <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
