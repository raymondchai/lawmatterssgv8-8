import { useState, useEffect, useCallback } from 'react';
import { annotationsApi, type DocumentAnnotation, type CreateAnnotationData, type UpdateAnnotationData } from '@/lib/api/annotations';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

interface UseAnnotationsReturn {
  annotations: DocumentAnnotation[];
  loading: boolean;
  error: string | null;
  createAnnotation: (data: Omit<CreateAnnotationData, 'document_id'>) => Promise<DocumentAnnotation | null>;
  updateAnnotation: (id: string, updates: UpdateAnnotationData) => Promise<DocumentAnnotation | null>;
  deleteAnnotation: (id: string) => Promise<boolean>;
  resolveAnnotation: (id: string) => Promise<boolean>;
  createReply: (annotationId: string, content: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export const useAnnotations = (documentId: string): UseAnnotationsReturn => {
  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch annotations
  const fetchAnnotations = useCallback(async () => {
    if (!documentId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await annotationsApi.getDocumentAnnotations(documentId);
      setAnnotations(data);
    } catch (err: any) {
      console.error('Error fetching annotations:', err);
      setError(err.message || 'Failed to load annotations');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  // Initial load
  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  // Real-time subscription
  useEffect(() => {
    if (!documentId) return;

    const subscription = annotationsApi.subscribeToAnnotations(
      documentId,
      (payload) => {
        console.log('Real-time annotation update:', payload);
        
        // Refetch annotations to get the latest data with user info
        fetchAnnotations();
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [documentId, fetchAnnotations]);

  // Create annotation
  const createAnnotation = useCallback(async (
    data: Omit<CreateAnnotationData, 'document_id'>
  ): Promise<DocumentAnnotation | null> => {
    if (!user) {
      toast.error('You must be logged in to create annotations');
      return null;
    }

    try {
      const newAnnotation = await annotationsApi.createAnnotation({
        ...data,
        document_id: documentId
      });

      // Optimistically update local state
      setAnnotations(prev => [...prev, newAnnotation]);
      
      toast.success('Annotation created successfully');
      return newAnnotation;
    } catch (err: any) {
      console.error('Error creating annotation:', err);
      toast.error(err.message || 'Failed to create annotation');
      return null;
    }
  }, [documentId, user]);

  // Update annotation
  const updateAnnotation = useCallback(async (
    id: string, 
    updates: UpdateAnnotationData
  ): Promise<DocumentAnnotation | null> => {
    try {
      const updatedAnnotation = await annotationsApi.updateAnnotation(id, updates);

      // Optimistically update local state
      setAnnotations(prev => prev.map(annotation => 
        annotation.id === id ? updatedAnnotation : annotation
      ));

      toast.success('Annotation updated successfully');
      return updatedAnnotation;
    } catch (err: any) {
      console.error('Error updating annotation:', err);
      toast.error(err.message || 'Failed to update annotation');
      return null;
    }
  }, []);

  // Delete annotation
  const deleteAnnotation = useCallback(async (id: string): Promise<boolean> => {
    try {
      await annotationsApi.deleteAnnotation(id);

      // Optimistically update local state
      setAnnotations(prev => prev.filter(annotation => annotation.id !== id));

      toast.success('Annotation deleted successfully');
      return true;
    } catch (err: any) {
      console.error('Error deleting annotation:', err);
      toast.error(err.message || 'Failed to delete annotation');
      return false;
    }
  }, []);

  // Resolve annotation
  const resolveAnnotation = useCallback(async (id: string): Promise<boolean> => {
    try {
      const annotation = annotations.find(a => a.id === id);
      if (!annotation) return false;

      await annotationsApi.updateAnnotation(id, { 
        is_resolved: !annotation.is_resolved 
      });

      // Optimistically update local state
      setAnnotations(prev => prev.map(annotation => 
        annotation.id === id 
          ? { ...annotation, is_resolved: !annotation.is_resolved }
          : annotation
      ));

      toast.success(
        annotation.is_resolved 
          ? 'Annotation reopened' 
          : 'Annotation resolved'
      );
      return true;
    } catch (err: any) {
      console.error('Error resolving annotation:', err);
      toast.error(err.message || 'Failed to resolve annotation');
      return false;
    }
  }, [annotations]);

  // Create reply
  const createReply = useCallback(async (
    annotationId: string, 
    content: string
  ): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to reply');
      return false;
    }

    try {
      const newReply = await annotationsApi.createReply({
        annotation_id: annotationId,
        content
      });

      // Optimistically update local state
      setAnnotations(prev => prev.map(annotation => 
        annotation.id === annotationId
          ? {
              ...annotation,
              replies: [...(annotation.replies || []), newReply]
            }
          : annotation
      ));

      toast.success('Reply added successfully');
      return true;
    } catch (err: any) {
      console.error('Error creating reply:', err);
      toast.error(err.message || 'Failed to add reply');
      return false;
    }
  }, [user]);

  return {
    annotations,
    loading,
    error,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    resolveAnnotation,
    createReply,
    refetch: fetchAnnotations
  };
};

// Hook for managing document collaborators
export const useAnnotationCollaborators = (documentId: string) => {
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollaborators = useCallback(async () => {
    if (!documentId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await annotationsApi.getDocumentCollaborators(documentId);
      setCollaborators(data);
    } catch (err: any) {
      console.error('Error fetching collaborators:', err);
      setError(err.message || 'Failed to load collaborators');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  const inviteCollaborator = useCallback(async (
    email: string, 
    permissionLevel: 'view' | 'comment' | 'edit'
  ) => {
    try {
      await annotationsApi.inviteCollaborator({
        document_id: documentId,
        email,
        permission_level: permissionLevel
      });

      await fetchCollaborators();
      toast.success('Collaborator invited successfully');
      return true;
    } catch (err: any) {
      console.error('Error inviting collaborator:', err);
      toast.error(err.message || 'Failed to invite collaborator');
      return false;
    }
  }, [documentId, fetchCollaborators]);

  const removeCollaborator = useCallback(async (collaboratorId: string) => {
    try {
      await annotationsApi.removeCollaborator(collaboratorId);
      await fetchCollaborators();
      toast.success('Collaborator removed successfully');
      return true;
    } catch (err: any) {
      console.error('Error removing collaborator:', err);
      toast.error(err.message || 'Failed to remove collaborator');
      return false;
    }
  }, [fetchCollaborators]);

  const updatePermission = useCallback(async (
    collaboratorId: string, 
    permissionLevel: 'view' | 'comment' | 'edit'
  ) => {
    try {
      await annotationsApi.updateCollaboratorPermission(collaboratorId, permissionLevel);
      await fetchCollaborators();
      toast.success('Permission updated successfully');
      return true;
    } catch (err: any) {
      console.error('Error updating permission:', err);
      toast.error(err.message || 'Failed to update permission');
      return false;
    }
  }, [fetchCollaborators]);

  return {
    collaborators,
    loading,
    error,
    inviteCollaborator,
    removeCollaborator,
    updatePermission,
    refetch: fetchCollaborators
  };
};
