import { supabase } from '@/lib/supabase';

export interface DocumentAnnotation {
  id: string;
  document_id: string;
  user_id: string;
  type: 'highlight' | 'note' | 'sticky';
  page_number: number;
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  content: string;
  color: string;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  replies?: AnnotationReply[];
}

export interface AnnotationReply {
  id: string;
  annotation_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

export interface AnnotationCollaborator {
  id: string;
  document_id: string;
  user_id: string;
  invited_by: string;
  permission_level: 'view' | 'comment' | 'edit';
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface CreateAnnotationData {
  document_id: string;
  type: 'highlight' | 'note' | 'sticky';
  page_number: number;
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  content: string;
  color: string;
}

export interface UpdateAnnotationData {
  content?: string;
  color?: string;
  is_resolved?: boolean;
  position?: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
}

export interface CreateReplyData {
  annotation_id: string;
  content: string;
}

export interface InviteCollaboratorData {
  document_id: string;
  email: string;
  permission_level: 'view' | 'comment' | 'edit';
}

export const annotationsApi = {
  // Get all annotations for a document
  async getDocumentAnnotations(documentId: string): Promise<DocumentAnnotation[]> {
    const { data, error } = await supabase
      .from('document_annotations')
      .select(`
        *,
        user:profiles!document_annotations_user_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url
        ),
        replies:annotation_replies (
          *,
          user:profiles!annotation_replies_user_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url
          )
        )
      `)
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching annotations:', error);
      throw new Error('Failed to fetch annotations');
    }

    return data || [];
  },

  // Create a new annotation
  async createAnnotation(annotationData: CreateAnnotationData): Promise<DocumentAnnotation> {
    const { data, error } = await supabase
      .from('document_annotations')
      .insert(annotationData)
      .select(`
        *,
        user:profiles!document_annotations_user_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error creating annotation:', error);
      throw new Error('Failed to create annotation');
    }

    return data;
  },

  // Update an annotation
  async updateAnnotation(annotationId: string, updates: UpdateAnnotationData): Promise<DocumentAnnotation> {
    const { data, error } = await supabase
      .from('document_annotations')
      .update(updates)
      .eq('id', annotationId)
      .select(`
        *,
        user:profiles!document_annotations_user_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error updating annotation:', error);
      throw new Error('Failed to update annotation');
    }

    return data;
  },

  // Delete an annotation
  async deleteAnnotation(annotationId: string): Promise<void> {
    const { error } = await supabase
      .from('document_annotations')
      .delete()
      .eq('id', annotationId);

    if (error) {
      console.error('Error deleting annotation:', error);
      throw new Error('Failed to delete annotation');
    }
  },

  // Create a reply to an annotation
  async createReply(replyData: CreateReplyData): Promise<AnnotationReply> {
    const { data, error } = await supabase
      .from('annotation_replies')
      .insert(replyData)
      .select(`
        *,
        user:profiles!annotation_replies_user_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error creating reply:', error);
      throw new Error('Failed to create reply');
    }

    return data;
  },

  // Update a reply
  async updateReply(replyId: string, content: string): Promise<AnnotationReply> {
    const { data, error } = await supabase
      .from('annotation_replies')
      .update({ content })
      .eq('id', replyId)
      .select(`
        *,
        user:profiles!annotation_replies_user_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error updating reply:', error);
      throw new Error('Failed to update reply');
    }

    return data;
  },

  // Delete a reply
  async deleteReply(replyId: string): Promise<void> {
    const { error } = await supabase
      .from('annotation_replies')
      .delete()
      .eq('id', replyId);

    if (error) {
      console.error('Error deleting reply:', error);
      throw new Error('Failed to delete reply');
    }
  },

  // Get collaborators for a document
  async getDocumentCollaborators(documentId: string): Promise<AnnotationCollaborator[]> {
    const { data, error } = await supabase
      .from('annotation_collaborators')
      .select(`
        *,
        user:profiles!annotation_collaborators_user_id_fkey (
          id,
          first_name,
          last_name,
          email,
          avatar_url
        )
      `)
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching collaborators:', error);
      throw new Error('Failed to fetch collaborators');
    }

    return data || [];
  },

  // Invite a collaborator
  async inviteCollaborator(inviteData: InviteCollaboratorData): Promise<AnnotationCollaborator> {
    // First, find the user by email
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', inviteData.email)
      .single();

    if (userError || !userData) {
      throw new Error('User not found with this email address');
    }

    const { data, error } = await supabase
      .from('annotation_collaborators')
      .insert({
        document_id: inviteData.document_id,
        user_id: userData.id,
        permission_level: inviteData.permission_level,
        invited_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select(`
        *,
        user:profiles!annotation_collaborators_user_id_fkey (
          id,
          first_name,
          last_name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error inviting collaborator:', error);
      throw new Error('Failed to invite collaborator');
    }

    return data;
  },

  // Update collaborator permission
  async updateCollaboratorPermission(
    collaboratorId: string, 
    permissionLevel: 'view' | 'comment' | 'edit'
  ): Promise<AnnotationCollaborator> {
    const { data, error } = await supabase
      .from('annotation_collaborators')
      .update({ permission_level: permissionLevel })
      .eq('id', collaboratorId)
      .select(`
        *,
        user:profiles!annotation_collaborators_user_id_fkey (
          id,
          first_name,
          last_name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error updating collaborator permission:', error);
      throw new Error('Failed to update collaborator permission');
    }

    return data;
  },

  // Accept/decline collaboration invitation
  async updateCollaborationStatus(
    collaboratorId: string, 
    status: 'accepted' | 'declined'
  ): Promise<AnnotationCollaborator> {
    const { data, error } = await supabase
      .from('annotation_collaborators')
      .update({ status })
      .eq('id', collaboratorId)
      .select(`
        *,
        user:profiles!annotation_collaborators_user_id_fkey (
          id,
          first_name,
          last_name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error updating collaboration status:', error);
      throw new Error('Failed to update collaboration status');
    }

    return data;
  },

  // Remove collaborator
  async removeCollaborator(collaboratorId: string): Promise<void> {
    const { error } = await supabase
      .from('annotation_collaborators')
      .delete()
      .eq('id', collaboratorId);

    if (error) {
      console.error('Error removing collaborator:', error);
      throw new Error('Failed to remove collaborator');
    }
  },

  // Subscribe to real-time annotation changes
  subscribeToAnnotations(documentId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`annotations:${documentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_annotations',
          filter: `document_id=eq.${documentId}`
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'annotation_replies'
        },
        callback
      )
      .subscribe();
  }
};
