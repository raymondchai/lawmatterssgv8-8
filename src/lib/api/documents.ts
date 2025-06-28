import { supabase } from '@/lib/supabase';
import type { UploadedDocument } from '@/types';

export const documentsApi = {
  // Get all documents for the current user
  async getDocuments() {
    try {
      const { data, error } = await supabase
        .from('uploaded_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        throw error;
      }

      // Ensure data is an array and has valid structure
      if (!Array.isArray(data)) {
        console.warn('Documents data is not an array:', data);
        return [];
      }

      // Validate and clean document data
      const validDocuments = data.filter(doc => {
        if (!doc || typeof doc !== 'object') {
          console.warn('Invalid document object:', doc);
          return false;
        }
        return doc.id && doc.filename;
      }).map(doc => ({
        ...doc,
        // Ensure processing_status has a valid value
        processing_status: doc.processing_status || 'pending',
        // Ensure document_structure is an object
        document_structure: doc.document_structure || {}
      }));

      return validDocuments as UploadedDocument[];
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      throw error;
    }
  },

  // Get a specific document by ID
  async getDocument(id: string) {
    const { data, error } = await supabase
      .from('uploaded_documents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as UploadedDocument;
  },

  // Upload a new document
  async uploadDocument(file: File, documentType: string) {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('User not authenticated');

    // Check usage limits before upload with better error handling
    try {
      const { usageTrackingService } = await import('@/lib/services/usageTracking');
      const usageCheck = await usageTrackingService.checkUsageLimit('document_upload');

      if (!usageCheck.allowed) {
        // Provide more specific error message based on subscription tier
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_tier, role')
          .eq('id', user.data.user.id)
          .single();

        const tier = profile?.subscription_tier || 'free';
        const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';

        if (isAdmin) {
          console.warn('Admin user hit upload limit, allowing upload to proceed');
        } else {
          throw new Error(`Upload limit exceeded for ${tier} tier. You have used ${usageCheck.current}/${usageCheck.limit} document uploads this month. Please upgrade your plan to continue.`);
        }
      }
    } catch (usageError) {
      console.warn('Usage tracking failed, proceeding with upload:', usageError);
      // Continue with upload even if usage tracking fails
    }

    // Upload file to storage
    const fileName = `${user.data.user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    // Create document record
    const { data, error } = await supabase
      .from('uploaded_documents')
      .insert({
        user_id: user.data.user.id,
        filename: file.name,
        file_url: publicUrl,
        file_size: file.size,
        document_type: documentType,
        processing_status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data as UploadedDocument;
  },

  // Update document
  async updateDocument(id: string, updates: Partial<UploadedDocument>) {
    const { data, error } = await supabase
      .from('uploaded_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as UploadedDocument;
  },

  // Delete document
  async deleteDocument(id: string) {
    // First get the document to get the file path
    const document = await this.getDocument(id);
    
    // Delete from storage
    const filePath = document.file_url.split('/').pop();
    if (filePath) {
      await supabase.storage
        .from('documents')
        .remove([filePath]);
    }

    // Delete from database
    const { error } = await supabase
      .from('uploaded_documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Search documents
  async searchDocuments(query: string) {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      const { data, error } = await supabase
        .from('uploaded_documents')
        .select('*')
        .or(`filename.ilike.%${query}%,ocr_text.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching documents:', error);
        throw error;
      }

      if (!Array.isArray(data)) {
        console.warn('Search results data is not an array:', data);
        return [];
      }

      // Apply the same validation as getDocuments
      const validDocuments = data.filter(doc => {
        if (!doc || typeof doc !== 'object') {
          console.warn('Invalid document object in search:', doc);
          return false;
        }
        return doc.id && doc.filename;
      }).map(doc => ({
        ...doc,
        processing_status: doc.processing_status || 'pending',
        document_structure: doc.document_structure || {}
      }));

      return validDocuments as UploadedDocument[];
    } catch (error) {
      console.error('Failed to search documents:', error);
      throw error;
    }
  },

  // Get documents by status
  async getDocumentsByStatus(status: string) {
    const { data, error } = await supabase
      .from('uploaded_documents')
      .select('*')
      .eq('processing_status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as UploadedDocument[];
  },

  // Download document with usage tracking
  async downloadDocument(id: string, trackUsage: boolean = true) {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('User not authenticated');

    // Get document info
    const document = await this.getDocument(id);

    if (trackUsage) {
      // Check and increment download usage
      const { usageTrackingService } = await import('@/lib/services/usageTracking');
      const usageCheck = await usageTrackingService.checkAndIncrementUsage('document_download', id, {
        filename: document.filename,
        document_type: document.document_type,
        file_size: document.file_size
      });

      if (!usageCheck.allowed) {
        throw new Error(`Download limit exceeded. You have used ${usageCheck.limit?.current}/${usageCheck.limit?.limit} document downloads this month. Please upgrade your plan to continue.`);
      }
    }

    // Get file from storage
    const fileName = document.file_url.split('/').pop();
    if (!fileName) throw new Error('Invalid file URL');

    const { data, error } = await supabase.storage
      .from('documents')
      .download(fileName);

    if (error) throw error;

    return {
      data,
      filename: document.filename,
      contentType: `application/${document.document_type}`
    };
  },

  // Get document usage statistics
  async getDocumentUsage() {
    const { usageTrackingService } = await import('@/lib/services/usageTracking');
    return await usageTrackingService.getUsageStats();
  }
};
