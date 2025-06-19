import { supabase } from '@/lib/supabase';
import type { UploadedDocument } from '@/types';

export interface SharePermissions {
  canView: boolean;
  canDownload: boolean;
  canComment: boolean;
  canEdit: boolean;
  expiresAt?: string;
}

export interface DocumentShare {
  id: string;
  document_id: string;
  shared_by: string;
  shared_with?: string; // null for public shares
  share_token: string;
  permissions: SharePermissions;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
  access_count: number;
  last_accessed?: string;
}

export interface ShareLink {
  token: string;
  url: string;
  permissions: SharePermissions;
  expiresAt?: string;
}

export interface DocumentComment {
  id: string;
  document_id: string;
  user_id: string;
  content: string;
  position?: {
    page: number;
    x: number;
    y: number;
  };
  created_at: string;
  updated_at: string;
  is_resolved: boolean;
  parent_id?: string; // For replies
}

export interface CollaborationSession {
  id: string;
  document_id: string;
  participants: {
    user_id: string;
    user_name: string;
    joined_at: string;
    last_seen: string;
    cursor_position?: any;
  }[];
  created_at: string;
  is_active: boolean;
}

class DocumentSharingService {
  /**
   * Create a share link for a document
   */
  async createShareLink(
    documentId: string,
    permissions: SharePermissions,
    options: {
      expiresIn?: number; // hours
      shareWithEmail?: string;
      message?: string;
    } = {}
  ): Promise<ShareLink> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    // Check if user owns the document
    const { data: document, error: docError } = await supabase
      .from('uploaded_documents')
      .select('user_id')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    if (document.user_id !== user.id) {
      throw new Error('You can only share documents you own');
    }

    // Generate share token
    const shareToken = this.generateShareToken();
    
    // Calculate expiration
    const expiresAt = options.expiresIn 
      ? new Date(Date.now() + options.expiresIn * 60 * 60 * 1000).toISOString()
      : undefined;

    // Create share record
    const { data: share, error } = await supabase
      .from('document_shares')
      .insert({
        document_id: documentId,
        shared_by: user.id,
        shared_with: options.shareWithEmail ? await this.getUserIdByEmail(options.shareWithEmail) : null,
        share_token: shareToken,
        permissions,
        expires_at: expiresAt,
        is_active: true,
        access_count: 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create share link: ${error.message}`);
    }

    // Send email notification if sharing with specific user
    if (options.shareWithEmail) {
      await this.sendShareNotification(
        options.shareWithEmail,
        user.email || '',
        documentId,
        shareToken,
        options.message
      );
    }

    return {
      token: shareToken,
      url: `${window.location.origin}/shared/${shareToken}`,
      permissions,
      expiresAt
    };
  }

  /**
   * Access a shared document
   */
  async accessSharedDocument(shareToken: string): Promise<{
    document: UploadedDocument;
    permissions: SharePermissions;
    share: DocumentShare;
  }> {
    // Get share record
    const { data: share, error: shareError } = await supabase
      .from('document_shares')
      .select(`
        *,
        document:uploaded_documents(*),
        shared_by_user:profiles!document_shares_shared_by_fkey(email, first_name, last_name)
      `)
      .eq('share_token', shareToken)
      .eq('is_active', true)
      .single();

    if (shareError || !share) {
      throw new Error('Invalid or expired share link');
    }

    // Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      throw new Error('Share link has expired');
    }

    // Check if user has access (for private shares)
    if (share.shared_with) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== share.shared_with) {
        throw new Error('You do not have permission to access this document');
      }
    }

    // Update access count and last accessed
    await supabase
      .from('document_shares')
      .update({
        access_count: share.access_count + 1,
        last_accessed: new Date().toISOString()
      })
      .eq('id', share.id);

    return {
      document: share.document,
      permissions: share.permissions,
      share
    };
  }

  /**
   * Get all shares for a document
   */
  async getDocumentShares(documentId: string): Promise<DocumentShare[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const { data: shares, error } = await supabase
      .from('document_shares')
      .select(`
        *,
        shared_with_user:profiles!document_shares_shared_with_fkey(email, first_name, last_name)
      `)
      .eq('document_id', documentId)
      .eq('shared_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch shares: ${error.message}`);
    }

    return shares || [];
  }

  /**
   * Revoke a share link
   */
  async revokeShare(shareId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const { error } = await supabase
      .from('document_shares')
      .update({ is_active: false })
      .eq('id', shareId)
      .eq('shared_by', user.id);

    if (error) {
      throw new Error(`Failed to revoke share: ${error.message}`);
    }
  }

  /**
   * Add a comment to a document
   */
  async addComment(
    documentId: string,
    content: string,
    position?: { page: number; x: number; y: number },
    parentId?: string
  ): Promise<DocumentComment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const { data: comment, error } = await supabase
      .from('document_comments')
      .insert({
        document_id: documentId,
        user_id: user.id,
        content,
        position,
        parent_id: parentId,
        is_resolved: false
      })
      .select(`
        *,
        user:profiles(email, first_name, last_name, avatar_url)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to add comment: ${error.message}`);
    }

    return comment;
  }

  /**
   * Get comments for a document
   */
  async getDocumentComments(documentId: string): Promise<DocumentComment[]> {
    const { data: comments, error } = await supabase
      .from('document_comments')
      .select(`
        *,
        user:profiles(email, first_name, last_name, avatar_url),
        replies:document_comments!parent_id(
          *,
          user:profiles(email, first_name, last_name, avatar_url)
        )
      `)
      .eq('document_id', documentId)
      .is('parent_id', null)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch comments: ${error.message}`);
    }

    return comments || [];
  }

  /**
   * Resolve a comment
   */
  async resolveComment(commentId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const { error } = await supabase
      .from('document_comments')
      .update({ is_resolved: true })
      .eq('id', commentId);

    if (error) {
      throw new Error(`Failed to resolve comment: ${error.message}`);
    }
  }

  /**
   * Start a collaboration session
   */
  async startCollaborationSession(documentId: string): Promise<CollaborationSession> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    // Check for existing active session
    const { data: existingSession } = await supabase
      .from('collaboration_sessions')
      .select('*')
      .eq('document_id', documentId)
      .eq('is_active', true)
      .single();

    if (existingSession) {
      // Join existing session
      return this.joinCollaborationSession(existingSession.id);
    }

    // Create new session
    const { data: session, error } = await supabase
      .from('collaboration_sessions')
      .insert({
        document_id: documentId,
        participants: [{
          user_id: user.id,
          user_name: user.email,
          joined_at: new Date().toISOString(),
          last_seen: new Date().toISOString()
        }],
        is_active: true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to start collaboration session: ${error.message}`);
    }

    return session;
  }

  /**
   * Join a collaboration session
   */
  async joinCollaborationSession(sessionId: string): Promise<CollaborationSession> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const { data: session, error: fetchError } = await supabase
      .from('collaboration_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      throw new Error('Collaboration session not found');
    }

    // Add user to participants if not already present
    const participants = session.participants || [];
    const existingParticipant = participants.find(p => p.user_id === user.id);

    if (!existingParticipant) {
      participants.push({
        user_id: user.id,
        user_name: user.email || 'Unknown User',
        joined_at: new Date().toISOString(),
        last_seen: new Date().toISOString()
      });

      const { error: updateError } = await supabase
        .from('collaboration_sessions')
        .update({ participants })
        .eq('id', sessionId);

      if (updateError) {
        throw new Error(`Failed to join session: ${updateError.message}`);
      }
    }

    return { ...session, participants };
  }

  // Private helper methods

  private generateShareToken(): string {
    return crypto.randomUUID().replace(/-/g, '');
  }

  private async getUserIdByEmail(email: string): Promise<string | null> {
    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    return user?.id || null;
  }

  private async sendShareNotification(
    recipientEmail: string,
    senderEmail: string,
    documentId: string,
    shareToken: string,
    message?: string
  ): Promise<void> {
    // This would integrate with an email service
    // For now, we'll just log the notification
    console.log('Share notification:', {
      to: recipientEmail,
      from: senderEmail,
      documentId,
      shareToken,
      message
    });
  }
}

// Export singleton instance
export const documentSharingService = new DocumentSharingService();

// Export types
export type { 
  SharePermissions, 
  DocumentShare, 
  ShareLink, 
  DocumentComment, 
  CollaborationSession 
};
