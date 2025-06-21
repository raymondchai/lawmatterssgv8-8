/**
 * React hooks for PDF annotations management
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { annotationsApi } from '@/lib/api/annotations';
import type {
  PdfAnnotation,
  AnnotationComment,
  AnnotationShare,
  CreateAnnotationRequest,
  UpdateAnnotationRequest,
  CreateCommentRequest,
  ShareAnnotationRequest,
  AnnotationFilter,
  AnnotationSelection,
  AnnotationTool,
  DrawingState
} from '@/types/annotations';
import { toast } from 'sonner';

/**
 * Hook for managing document annotations
 */
export function useDocumentAnnotations(documentId: string, filter?: AnnotationFilter) {
  const queryClient = useQueryClient();

  const {
    data: annotations = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['annotations', documentId, filter],
    queryFn: () => annotationsApi.getDocumentAnnotations(documentId, filter),
    enabled: !!documentId,
    staleTime: 30000, // 30 seconds
  });

  const createMutation = useMutation({
    mutationFn: annotationsApi.createAnnotation,
    onSuccess: (newAnnotation) => {
      queryClient.setQueryData(['annotations', documentId, filter], (old: PdfAnnotation[] = []) => [
        ...old,
        newAnnotation
      ]);
      toast.success('Annotation created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create annotation: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAnnotationRequest }) =>
      annotationsApi.updateAnnotation(id, data),
    onSuccess: (updatedAnnotation) => {
      queryClient.setQueryData(['annotations', documentId, filter], (old: PdfAnnotation[] = []) =>
        old.map(annotation => 
          annotation.id === updatedAnnotation.id ? updatedAnnotation : annotation
        )
      );
      toast.success('Annotation updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update annotation: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: annotationsApi.deleteAnnotation,
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(['annotations', documentId, filter], (old: PdfAnnotation[] = []) =>
        old.filter(annotation => annotation.id !== deletedId)
      );
      toast.success('Annotation deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete annotation: ${error.message}`);
    }
  });

  const createAnnotation = useCallback((data: CreateAnnotationRequest) => {
    return createMutation.mutateAsync(data);
  }, [createMutation]);

  const updateAnnotation = useCallback((id: string, data: UpdateAnnotationRequest) => {
    return updateMutation.mutateAsync({ id, data });
  }, [updateMutation]);

  const deleteAnnotation = useCallback((id: string) => {
    return deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  return {
    annotations,
    isLoading,
    error,
    refetch,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}

/**
 * Hook for managing page-specific annotations
 */
export function usePageAnnotations(documentId: string, pageNumber: number) {
  const {
    data: annotations = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['annotations', documentId, 'page', pageNumber],
    queryFn: () => annotationsApi.getPageAnnotations(documentId, pageNumber),
    enabled: !!documentId && pageNumber > 0,
    staleTime: 30000,
  });

  return {
    annotations,
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook for managing annotation comments
 */
export function useAnnotationComments(annotationId: string) {
  const queryClient = useQueryClient();

  const addCommentMutation = useMutation({
    mutationFn: annotationsApi.addComment,
    onSuccess: (newComment) => {
      // Update the annotation in cache to include the new comment
      queryClient.setQueriesData(
        { queryKey: ['annotations'] },
        (old: PdfAnnotation[] = []) =>
          old.map(annotation =>
            annotation.id === annotationId
              ? { ...annotation, comments: [...(annotation.comments || []), newComment] }
              : annotation
          )
      );
      toast.success('Comment added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add comment: ${error.message}`);
    }
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      annotationsApi.updateComment(id, content),
    onSuccess: (updatedComment) => {
      queryClient.setQueriesData(
        { queryKey: ['annotations'] },
        (old: PdfAnnotation[] = []) =>
          old.map(annotation =>
            annotation.id === annotationId
              ? {
                  ...annotation,
                  comments: annotation.comments?.map(comment =>
                    comment.id === updatedComment.id ? updatedComment : comment
                  ) || []
                }
              : annotation
          )
      );
      toast.success('Comment updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update comment: ${error.message}`);
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: annotationsApi.deleteComment,
    onSuccess: (_, deletedId) => {
      queryClient.setQueriesData(
        { queryKey: ['annotations'] },
        (old: PdfAnnotation[] = []) =>
          old.map(annotation =>
            annotation.id === annotationId
              ? {
                  ...annotation,
                  comments: annotation.comments?.filter(comment => comment.id !== deletedId) || []
                }
              : annotation
          )
      );
      toast.success('Comment deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete comment: ${error.message}`);
    }
  });

  const addComment = useCallback((data: CreateCommentRequest) => {
    return addCommentMutation.mutateAsync(data);
  }, [addCommentMutation]);

  const updateComment = useCallback((id: string, content: string) => {
    return updateCommentMutation.mutateAsync({ id, content });
  }, [updateCommentMutation]);

  const deleteComment = useCallback((id: string) => {
    return deleteCommentMutation.mutateAsync(id);
  }, [deleteCommentMutation]);

  return {
    addComment,
    updateComment,
    deleteComment,
    isAddingComment: addCommentMutation.isPending,
    isUpdatingComment: updateCommentMutation.isPending,
    isDeletingComment: deleteCommentMutation.isPending
  };
}

/**
 * Hook for managing annotation sharing
 */
export function useAnnotationSharing() {
  const queryClient = useQueryClient();

  const shareMutation = useMutation({
    mutationFn: annotationsApi.shareAnnotation,
    onSuccess: (newShare) => {
      // Update the annotation in cache to include the new share
      queryClient.setQueriesData(
        { queryKey: ['annotations'] },
        (old: PdfAnnotation[] = []) =>
          old.map(annotation =>
            annotation.id === newShare.annotationId
              ? { ...annotation, shares: [...(annotation.shares || []), newShare] }
              : annotation
          )
      );
      toast.success('Annotation shared successfully');
    },
    onError: (error) => {
      toast.error(`Failed to share annotation: ${error.message}`);
    }
  });

  const removeMutation = useMutation({
    mutationFn: annotationsApi.removeShare,
    onSuccess: (_, shareId) => {
      queryClient.setQueriesData(
        { queryKey: ['annotations'] },
        (old: PdfAnnotation[] = []) =>
          old.map(annotation => ({
            ...annotation,
            shares: annotation.shares?.filter(share => share.id !== shareId) || []
          }))
      );
      toast.success('Share removed successfully');
    },
    onError: (error) => {
      toast.error(`Failed to remove share: ${error.message}`);
    }
  });

  const shareAnnotation = useCallback((data: ShareAnnotationRequest) => {
    return shareMutation.mutateAsync(data);
  }, [shareMutation]);

  const removeShare = useCallback((shareId: string) => {
    return removeMutation.mutateAsync(shareId);
  }, [removeMutation]);

  return {
    shareAnnotation,
    removeShare,
    isSharing: shareMutation.isPending,
    isRemoving: removeMutation.isPending
  };
}

/**
 * Hook for managing annotation UI state
 */
export function useAnnotationState() {
  const [selectedAnnotation, setSelectedAnnotation] = useState<AnnotationSelection>({
    annotation: null,
    isEditing: false
  });

  const [activeTool, setActiveTool] = useState<AnnotationTool>({
    type: 'highlight',
    color: 'yellow',
    isActive: false
  });

  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    currentPath: '',
    strokeWidth: 2,
    color: 'red'
  });

  const selectAnnotation = useCallback((annotation: PdfAnnotation | null, isEditing = false) => {
    setSelectedAnnotation({ annotation, isEditing });
  }, []);

  const activateTool = useCallback((type: AnnotationTool['type'], color: AnnotationTool['color'] = 'yellow') => {
    setActiveTool({ type, color, isActive: true });
  }, []);

  const deactivateTool = useCallback(() => {
    setActiveTool(prev => ({ ...prev, isActive: false }));
  }, []);

  const startDrawing = useCallback((color: DrawingState['color'] = 'red', strokeWidth = 2) => {
    setDrawingState({
      isDrawing: true,
      currentPath: '',
      strokeWidth,
      color
    });
  }, []);

  const updateDrawingPath = useCallback((path: string) => {
    setDrawingState(prev => ({ ...prev, currentPath: path }));
  }, []);

  const stopDrawing = useCallback(() => {
    setDrawingState(prev => ({ ...prev, isDrawing: false }));
  }, []);

  return {
    selectedAnnotation,
    activeTool,
    drawingState,
    selectAnnotation,
    activateTool,
    deactivateTool,
    startDrawing,
    updateDrawingPath,
    stopDrawing
  };
}
