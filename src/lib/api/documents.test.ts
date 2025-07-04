import { describe, it, expect, vi, beforeEach } from 'vitest';
import { documentsApi } from './documents';
import { mockDocument } from '@/test/utils';

// Create a mock supabase client
const mockSupabaseClient = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    order: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      getPublicUrl: vi.fn(() => ({
        data: { publicUrl: 'https://example.com/file.pdf' },
      })),
      remove: vi.fn(),
    })),
  },
  rpc: vi.fn(),
}));

// Mock the supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient,
}));

// Mock usage tracking service
vi.mock('@/lib/services/usageTracking', () => ({
  usageTrackingService: {
    checkUsageLimit: vi.fn().mockResolvedValue({ allowed: true }),
    checkAndIncrementUsage: vi.fn().mockResolvedValue({ allowed: true }),
    getUsageStats: vi.fn().mockResolvedValue({}),
  },
}));

describe('documentsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDocuments', () => {
    it('should fetch all documents for the current user', async () => {
      const mockDocuments = [mockDocument];

      // Mock the chain to return a resolved promise
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };

      // The final method in the chain should return a promise
      mockChain.order.mockResolvedValue({
        data: mockDocuments,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await documentsApi.getDocuments();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('uploaded_documents');
      expect(result).toEqual(mockDocuments);
    });

    it('should throw error when fetch fails', async () => {
      const mockError = new Error('Database error');

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };

      mockChain.order.mockResolvedValue({
        data: null,
        error: mockError,
      });

      mockSupabaseClient.from.mockReturnValue(mockChain);

      await expect(documentsApi.getDocuments()).rejects.toThrow('Database error');
    });
  });

  describe('getDocument', () => {
    it('should fetch a specific document by ID', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      };

      mockChain.single.mockResolvedValue({
        data: mockDocument,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await documentsApi.getDocument('test-id');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('uploaded_documents');
      expect(result).toEqual(mockDocument);
    });

    it('should throw error when document not found', async () => {
      const mockError = new Error('Document not found');

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      };

      mockChain.single.mockResolvedValue({
        data: null,
        error: mockError,
      });

      mockSupabaseClient.from.mockReturnValue(mockChain);

      await expect(documentsApi.getDocument('invalid-id')).rejects.toThrow('Document not found');
    });
  });

  describe('uploadDocument', () => {
    it('should upload a document successfully', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const mockUser = { id: 'user-id', email: 'test@example.com' };

      // Mock auth.getUser
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock storage operations
      const mockStorageChain = {
        upload: vi.fn().mockResolvedValue({
          data: { path: 'user-id/123-test.pdf' },
          error: null,
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/test.pdf' },
        }),
      };

      mockSupabaseClient.storage.from.mockReturnValue(mockStorageChain);

      // Mock database insert chain
      const mockDbChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      };

      mockDbChain.single.mockResolvedValue({
        data: mockDocument,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue(mockDbChain);

      const result = await documentsApi.uploadDocument(mockFile, 'contract');

      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('documents');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('uploaded_documents');
      expect(result).toEqual(mockDocument);
    });

    it('should throw error when user is not authenticated', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(documentsApi.uploadDocument(mockFile, 'contract')).rejects.toThrow('User not authenticated');
    });

    it('should throw error when storage upload fails', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const mockUser = { id: 'user-id', email: 'test@example.com' };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const uploadError = new Error('Storage upload failed');
      const mockStorageChain = {
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: uploadError,
        }),
      };

      mockSupabaseClient.storage.from.mockReturnValue(mockStorageChain);

      await expect(documentsApi.uploadDocument(mockFile, 'contract')).rejects.toThrow('Storage upload failed');
    });
  });

  describe('updateDocument', () => {
    it('should update a document successfully', async () => {
      const updates = { processing_status: 'completed' as const };
      const updatedDocument = { ...mockDocument, ...updates };

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      };

      mockChain.single.mockResolvedValue({
        data: updatedDocument,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await documentsApi.updateDocument('test-id', updates);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('uploaded_documents');
      expect(result).toEqual(updatedDocument);
    });

    it('should throw error when update fails', async () => {
      const updates = { processing_status: 'completed' as const };
      const mockError = new Error('Update failed');

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      };

      mockChain.single.mockResolvedValue({
        data: null,
        error: mockError,
      });

      mockSupabaseClient.from.mockReturnValue(mockChain);

      await expect(documentsApi.updateDocument('test-id', updates)).rejects.toThrow('Update failed');
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document and its file', async () => {
      // Mock getDocument
      const getDocumentSpy = vi.spyOn(documentsApi, 'getDocument');
      getDocumentSpy.mockResolvedValue(mockDocument);

      // Mock storage remove
      const mockStorageChain = {
        remove: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabaseClient.storage.from.mockReturnValue(mockStorageChain);

      // Mock database delete
      const mockDbChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      mockDbChain.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue(mockDbChain);

      await documentsApi.deleteDocument('test-id');

      expect(getDocumentSpy).toHaveBeenCalledWith('test-id');
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('documents');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('uploaded_documents');
    });

    it('should throw error when delete fails', async () => {
      const getDocumentSpy = vi.spyOn(documentsApi, 'getDocument');
      getDocumentSpy.mockResolvedValue(mockDocument);

      const mockStorageChain = {
        remove: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabaseClient.storage.from.mockReturnValue(mockStorageChain);

      const deleteError = new Error('Delete failed');
      const mockDbChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      mockDbChain.eq.mockResolvedValue({
        data: null,
        error: deleteError,
      });

      mockSupabaseClient.from.mockReturnValue(mockDbChain);

      await expect(documentsApi.deleteDocument('test-id')).rejects.toThrow('Delete failed');
    });
  });

  describe('searchDocuments', () => {
    it('should search documents by query', async () => {
      const mockDocuments = [mockDocument];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };

      mockChain.order.mockResolvedValue({
        data: mockDocuments,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await documentsApi.searchDocuments('test query');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('uploaded_documents');
      expect(result).toEqual(mockDocuments);
    });

    it('should throw error when search fails', async () => {
      const searchError = new Error('Search failed');

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };

      mockChain.order.mockResolvedValue({
        data: null,
        error: searchError,
      });

      mockSupabaseClient.from.mockReturnValue(mockChain);

      await expect(documentsApi.searchDocuments('test query')).rejects.toThrow('Search failed');
    });
  });

  describe('getDocumentsByStatus', () => {
    it('should fetch documents by status', async () => {
      const mockDocuments = [mockDocument];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };

      mockChain.order.mockResolvedValue({
        data: mockDocuments,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await documentsApi.getDocumentsByStatus('completed');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('uploaded_documents');
      expect(result).toEqual(mockDocuments);
    });

    it('should throw error when fetch fails', async () => {
      const fetchError = new Error('Fetch failed');

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };

      mockChain.order.mockResolvedValue({
        data: null,
        error: fetchError,
      });

      mockSupabaseClient.from.mockReturnValue(mockChain);

      await expect(documentsApi.getDocumentsByStatus('completed')).rejects.toThrow('Fetch failed');
    });
  });
});
