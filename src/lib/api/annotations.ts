/**
 * API service for PDF annotations and highlights
 * Updated to work with existing document_annotations schema
 */

import { supabase } from '@/lib/supabase';

// Legacy types to match existing schema
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
}

export interface CreateAnnotationRequest {
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

export interface UpdateAnnotationRequest {
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

class AnnotationsApi {
  /**
   * Get all annotations for a document
   */
  async getDocumentAnnotations(documentId: string): Promise<DocumentAnnotation[]> {
    const { data, error } = await supabase
      .from('document_annotations')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch annotations: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new annotation
   */
  async createAnnotation(annotation: CreateAnnotationRequest): Promise<DocumentAnnotation> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('document_annotations')
      .insert({
        ...annotation,
        user_id: user.user.id,
        is_resolved: false
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create annotation: ${error.message}`);
    }

    return data;
  }

  /**
   * Update an annotation
   */
  async updateAnnotation(id: string, updates: UpdateAnnotationRequest): Promise<DocumentAnnotation> {
    const { data, error } = await supabase
      .from('document_annotations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update annotation: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete an annotation
   */
  async deleteAnnotation(id: string): Promise<void> {
    const { error } = await supabase
      .from('document_annotations')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete annotation: ${error.message}`);
    }
  }

  // Real-time subscription for annotations (disabled in production)
  subscribeToAnnotations(documentId: string, callback: (payload: any) => void) {
    console.log('Skipping annotations real-time subscription - disabled in production');
    // Return a mock subscription object
    return {
      unsubscribe: () => console.log('Mock unsubscribe called')
    };
  }

  // Get document collaborators
  async getDocumentCollaborators(documentId: string) {
    const { data, error } = await supabase
      .from('annotation_collaborators')
      .select(`
        *,
        user:profiles!annotation_collaborators_user_id_fkey(id, email, first_name, last_name),
        invited_by_user:profiles!annotation_collaborators_invited_by_fkey(id, email, first_name, last_name)
      `)
      .eq('document_id', documentId);

    if (error) {
      throw new Error(`Failed to fetch collaborators: ${error.message}`);
    }

    return data || [];
  }

  // Invite collaborator
  async inviteCollaborator(inviteData: {
    document_id: string;
    email: string;
    permission_level: 'view' | 'comment' | 'edit';
  }) {
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
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to invite collaborator: ${error.message}`);
    }

    return data;
  }

  // Remove collaborator
  async removeCollaborator(collaboratorId: string) {
    const { error } = await supabase
      .from('annotation_collaborators')
      .delete()
      .eq('id', collaboratorId);

    if (error) {
      throw new Error(`Failed to remove collaborator: ${error.message}`);
    }
  }

  // Update collaborator permission
  async updateCollaboratorPermission(collaboratorId: string, permissionLevel: 'view' | 'comment' | 'edit') {
    const { data, error } = await supabase
      .from('annotation_collaborators')
      .update({ permission_level: permissionLevel })
      .eq('id', collaboratorId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update permission: ${error.message}`);
    }

    return data;
  }

  // Create reply to annotation
  async createReply(replyData: {
    annotation_id: string;
    content: string;
  }) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('annotation_replies')
      .insert({
        ...replyData,
        user_id: user.user.id
      })
      .select(`
        *,
        user:profiles!annotation_replies_user_id_fkey(id, email, first_name, last_name)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create reply: ${error.message}`);
    }

    return data;
  }
}

export const annotationsApi = new AnnotationsApi();
