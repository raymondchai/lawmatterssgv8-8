import { supabase } from '@/lib/supabase';
import { PUBLIC_ANALYSIS_CONFIG } from '@/lib/config/constants';

export interface StorageQuota {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
}

export interface SessionStorageInfo {
  sessionId: string;
  totalFiles: number;
  totalSize: number;
  quota: StorageQuota;
  expiresAt: Date;
}

class PublicStorageManager {
  private readonly config = PUBLIC_ANALYSIS_CONFIG;

  /**
   * Get storage information for a session
   */
  async getSessionStorageInfo(sessionId: string): Promise<SessionStorageInfo | null> {
    try {
      // Get session info
      const { data: session, error: sessionError } = await supabase
        .from('public_analysis_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        return null;
      }

      // Get file count for this session
      const { data: analyses, error: analysesError } = await supabase
        .from('public_document_analyses')
        .select('file_size')
        .eq('session_id', sessionId);

      if (analysesError) {
        console.error('Error getting session analyses:', analysesError);
        return null;
      }

      const totalFiles = analyses?.length || 0;
      const totalSize = session.total_storage_used || 0;
      const limit = this.config.storage.maxStoragePerSession;

      return {
        sessionId,
        totalFiles,
        totalSize,
        quota: {
          used: totalSize,
          limit,
          remaining: Math.max(0, limit - totalSize),
          percentage: Math.min(100, (totalSize / limit) * 100)
        },
        expiresAt: new Date(session.expires_at)
      };
    } catch (error) {
      console.error('Error getting session storage info:', error);
      return null;
    }
  }

  /**
   * Check if a session can upload more files
   */
  async canUploadFile(sessionId: string, fileSize: number): Promise<{
    allowed: boolean;
    reason?: string;
    storageInfo?: SessionStorageInfo;
  }> {
    const storageInfo = await this.getSessionStorageInfo(sessionId);
    
    if (!storageInfo) {
      return {
        allowed: false,
        reason: 'Session not found or expired'
      };
    }

    // Check if session is expired
    if (new Date() > storageInfo.expiresAt) {
      return {
        allowed: false,
        reason: 'Session has expired',
        storageInfo
      };
    }

    // Check storage quota
    if (storageInfo.quota.remaining < fileSize) {
      return {
        allowed: false,
        reason: `Storage quota exceeded. You have ${Math.round(storageInfo.quota.remaining / (1024 * 1024))}MB remaining, but need ${Math.round(fileSize / (1024 * 1024))}MB.`,
        storageInfo
      };
    }

    return {
      allowed: true,
      storageInfo
    };
  }

  /**
   * Upload file to session storage
   */
  async uploadFile(
    sessionId: string,
    file: File,
    filename?: string
  ): Promise<{
    success: boolean;
    filePath?: string;
    error?: string;
  }> {
    try {
      // Check if upload is allowed
      const uploadCheck = await this.canUploadFile(sessionId, file.size);
      if (!uploadCheck.allowed) {
        return {
          success: false,
          error: uploadCheck.reason
        };
      }

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = (filename || file.name).replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${sessionId}/${timestamp}_${sanitizedName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(this.config.storage.bucket)
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        console.error('File upload error:', uploadError);
        return {
          success: false,
          error: `Upload failed: ${uploadError.message}`
        };
      }

      return {
        success: true,
        filePath
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      return {
        success: false,
        error: 'Upload failed due to an unexpected error'
      };
    }
  }

  /**
   * Delete a file from session storage
   */
  async deleteFile(sessionId: string, filePath: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Verify the file belongs to this session
      if (!filePath.startsWith(`${sessionId}/`)) {
        return {
          success: false,
          error: 'File does not belong to this session'
        };
      }

      const { error } = await supabase.storage
        .from(this.config.storage.bucket)
        .remove([filePath]);

      if (error) {
        console.error('File deletion error:', error);
        return {
          success: false,
          error: `Deletion failed: ${error.message}`
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      return {
        success: false,
        error: 'Deletion failed due to an unexpected error'
      };
    }
  }

  /**
   * List files in a session
   */
  async listSessionFiles(sessionId: string): Promise<{
    success: boolean;
    files?: Array<{
      name: string;
      size: number;
      lastModified: Date;
      publicUrl?: string;
    }>;
    error?: string;
  }> {
    try {
      const { data: files, error } = await supabase.storage
        .from(this.config.storage.bucket)
        .list(sessionId);

      if (error) {
        console.error('Error listing files:', error);
        return {
          success: false,
          error: `Failed to list files: ${error.message}`
        };
      }

      const fileList = files?.map(file => ({
        name: file.name,
        size: file.metadata?.size || 0,
        lastModified: new Date(file.updated_at || file.created_at),
        publicUrl: undefined // Files are private for public analysis
      })) || [];

      return {
        success: true,
        files: fileList
      };
    } catch (error) {
      console.error('Error listing session files:', error);
      return {
        success: false,
        error: 'Failed to list files due to an unexpected error'
      };
    }
  }

  /**
   * Clean up expired sessions and their files
   */
  async cleanupExpiredSessions(): Promise<{
    success: boolean;
    stats?: {
      sessionsDeleted: number;
      analysesDeleted: number;
      filesDeleted: number;
    };
    error?: string;
  }> {
    try {
      // Call the cleanup Edge Function
      const { data, error } = await supabase.functions.invoke('cleanup-public-data');

      if (error) {
        console.error('Cleanup function error:', error);
        return {
          success: false,
          error: `Cleanup failed: ${error.message}`
        };
      }

      return {
        success: data.success,
        stats: data.stats,
        error: data.success ? undefined : data.error
      };
    } catch (error) {
      console.error('Error calling cleanup function:', error);
      return {
        success: false,
        error: 'Cleanup failed due to an unexpected error'
      };
    }
  }

  /**
   * Get download URL for a file (temporary, signed URL)
   */
  async getFileDownloadUrl(
    sessionId: string, 
    filePath: string, 
    expiresIn: number = 3600 // 1 hour default
  ): Promise<{
    success: boolean;
    url?: string;
    error?: string;
  }> {
    try {
      // Verify the file belongs to this session
      if (!filePath.startsWith(`${sessionId}/`)) {
        return {
          success: false,
          error: 'File does not belong to this session'
        };
      }

      const { data, error } = await supabase.storage
        .from(this.config.storage.bucket)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('Error creating signed URL:', error);
        return {
          success: false,
          error: `Failed to create download URL: ${error.message}`
        };
      }

      return {
        success: true,
        url: data.signedUrl
      };
    } catch (error) {
      console.error('Error getting download URL:', error);
      return {
        success: false,
        error: 'Failed to create download URL due to an unexpected error'
      };
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalSessions: number;
    totalFiles: number;
    totalSize: number;
    expiredSessions: number;
  }> {
    try {
      const now = new Date().toISOString();

      // Get total sessions
      const { count: totalSessions } = await supabase
        .from('public_analysis_sessions')
        .select('*', { count: 'exact', head: true });

      // Get expired sessions
      const { count: expiredSessions } = await supabase
        .from('public_analysis_sessions')
        .select('*', { count: 'exact', head: true })
        .lt('expires_at', now);

      // Get total analyses (files)
      const { count: totalFiles } = await supabase
        .from('public_document_analyses')
        .select('*', { count: 'exact', head: true });

      // Get total storage used
      const { data: sessions } = await supabase
        .from('public_analysis_sessions')
        .select('total_storage_used');

      const totalSize = sessions?.reduce((sum, session) => 
        sum + (session.total_storage_used || 0), 0) || 0;

      return {
        totalSessions: totalSessions || 0,
        totalFiles: totalFiles || 0,
        totalSize,
        expiredSessions: expiredSessions || 0
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalSessions: 0,
        totalFiles: 0,
        totalSize: 0,
        expiredSessions: 0
      };
    }
  }
}

export const publicStorageManager = new PublicStorageManager();
