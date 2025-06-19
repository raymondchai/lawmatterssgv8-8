import { supabase } from '@/lib/supabase';
import type { UploadedDocument } from '@/types';

export const documentsApi = {
  // Get all documents for the current user
  async getDocuments() {
    const { data, error } = await supabase
      .from('uploaded_documents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as UploadedDocument[];
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

    // Upload file to storage
    const fileName = `${user.data.user.id}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
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
    const { data, error } = await supabase
      .from('uploaded_documents')
      .select('*')
      .or(`filename.ilike.%${query}%,ocr_text.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as UploadedDocument[];
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
  }
};
