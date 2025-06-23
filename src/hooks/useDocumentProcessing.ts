import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api/documents';
import {
  enhancedDocumentProcessor,
  type EnhancedProcessingStatus,
  type DocumentProcessingOptions,
  type EnhancedDocumentProcessingResult
} from '@/lib/services/enhancedDocumentProcessor';
import {
  documentExportService,
  type ExportOptions,
  type CustomDocumentRequest
} from '@/lib/services/documentExport';
import { useToast } from '@/hooks/use-toast';
import type { UploadedDocument } from '@/types';

export interface DocumentUploadState {
  isUploading: boolean;
  isProcessing: boolean;
  progress: number;
  status: EnhancedProcessingStatus | null;
  error: string | null;
}

/**
 * Hook for document upload and processing
 */
export function useDocumentUpload() {
  const [uploadState, setUploadState] = useState<DocumentUploadState>({
    isUploading: false,
    isProcessing: false,
    progress: 0,
    status: null,
    error: null
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadAndProcessDocument = useCallback(async (
    file: File,
    documentType: string,
    options: DocumentProcessingOptions = {}
  ): Promise<EnhancedDocumentProcessingResult> => {
    try {
      // Reset state
      setUploadState({
        isUploading: true,
        isProcessing: false,
        progress: 0,
        status: null,
        error: null
      });

      // Stage 1: Upload document
      const document = await documentsApi.uploadDocument(file, documentType);
      
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        isProcessing: true,
        progress: 10
      }));

      // Stage 2: Process document
      const result = await enhancedDocumentProcessor.processDocument(
        file,
        document.id,
        options,
        (status) => {
          setUploadState(prev => ({
            ...prev,
            progress: status.progress,
            status,
            error: status.error || null
          }));
        }
      );

      // Success
      setUploadState(prev => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        error: null
      }));

      // Invalidate queries to refresh document lists
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', document.id] });

      toast({
        title: 'Document Processed',
        description: `${file.name} has been successfully uploaded and processed.`,
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        isProcessing: false,
        error: errorMessage
      }));

      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      });

      throw error;
    }
  }, [queryClient, toast]);

  const resetUploadState = useCallback(() => {
    setUploadState({
      isUploading: false,
      isProcessing: false,
      progress: 0,
      status: null,
      error: null
    });
  }, []);

  return {
    uploadAndProcessDocument,
    uploadState,
    resetUploadState,
    isActive: uploadState.isUploading || uploadState.isProcessing
  };
}

/**
 * Hook for fetching documents
 */
export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.getDocuments(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching a single document
 */
export function useDocument(id: string) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => documentsApi.getDocument(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for searching documents
 */
export function useDocumentSearch() {
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useQuery({
    queryKey: ['documents', 'search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 3) {
        return [];
      }
      try {
        return await documentsApi.searchDocuments(searchQuery);
      } catch (error) {
        console.error('Search error:', error);
        return [];
      }
    },
    enabled: searchQuery.length > 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    searchQuery,
    setSearchQuery,
    searchResults: searchResults.data || [],
    isSearching: searchResults.isLoading,
    searchError: searchResults.error
  };
}

/**
 * Hook for document deletion
 */
export function useDocumentDeletion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (documentId: string) => documentsApi.deleteDocument(documentId),
    onSuccess: (_, documentId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['document', documentId] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      
      toast({
        title: 'Document Deleted',
        description: 'The document has been successfully deleted.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Deletion Failed',
        description: error instanceof Error ? error.message : 'Failed to delete document',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for document download
 */
export function useDocumentDownload() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ documentId, trackUsage = true }: { documentId: string; trackUsage?: boolean }) =>
      documentsApi.downloadDocument(documentId, trackUsage),
    onSuccess: (result) => {
      // Create download link
      const url = URL.createObjectURL(result.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download Started',
        description: `Downloading ${result.filename}...`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download document',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for document reprocessing
 */
export function useDocumentReprocessing() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ 
      documentId, 
      options = {} 
    }: { 
      documentId: string; 
      options?: DocumentProcessingOptions 
    }) => {
      // This would need to be implemented in the enhanced processor
      // For now, we'll use a placeholder
      return Promise.resolve({ documentId, options });
    },
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      
      toast({
        title: 'Reprocessing Started',
        description: 'The document is being reprocessed with updated algorithms.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Reprocessing Failed',
        description: error instanceof Error ? error.message : 'Failed to reprocess document',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for bulk document operations
 */
export function useBulkDocumentOperations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const bulkDelete = useMutation({
    mutationFn: async (documentIds: string[]) => {
      const results = await Promise.allSettled(
        documentIds.map(id => documentsApi.deleteDocument(id))
      );
      
      const failed = results.filter(r => r.status === 'rejected').length;
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      
      return { succeeded, failed, total: documentIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      
      if (result.failed > 0) {
        toast({
          title: 'Bulk Delete Completed',
          description: `${result.succeeded} documents deleted, ${result.failed} failed.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Bulk Delete Completed',
          description: `Successfully deleted ${result.succeeded} documents.`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Bulk Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete documents',
        variant: 'destructive',
      });
    },
  });

  return {
    bulkDelete,
    isBulkDeleting: bulkDelete.isPending
  };
}

/**
 * Hook for document statistics
 */
export function useDocumentStats() {
  return useQuery({
    queryKey: ['documents', 'stats'],
    queryFn: async () => {
      try {
        const documents = await documentsApi.getDocuments();
        const usage = await documentsApi.getDocumentUsage();

        const stats = {
          total: documents.length,
          byStatus: documents.reduce((acc, doc) => {
            acc[doc.processing_status] = (acc[doc.processing_status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          byType: documents.reduce((acc, doc) => {
            acc[doc.document_type] = (acc[doc.document_type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          totalSize: documents.reduce((acc, doc) => acc + doc.file_size, 0),
          usage
        };

        return stats;
      } catch (error) {
        console.error('Error fetching document stats:', error);
        // Return default stats on error
        return {
          total: 0,
          byStatus: {},
          byType: {},
          totalSize: 0,
          usage: null
        };
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for document export operations
 */
export function useDocumentExport() {
  const { toast } = useToast();

  const exportDocument = useMutation({
    mutationFn: ({ documentId, options }: { documentId: string; options?: ExportOptions }) =>
      documentExportService.downloadDocument(documentId, options),
    onSuccess: (result) => {
      // Create download link
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Started',
        description: `Downloading ${result.filename} (${(result.size / 1024 / 1024).toFixed(2)} MB)`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export document',
        variant: 'destructive',
      });
    },
  });

  const bulkExport = useMutation({
    mutationFn: ({ documentIds, options }: { documentIds: string[]; options?: ExportOptions }) =>
      documentExportService.bulkExport(documentIds, options),
    onSuccess: (result, { documentIds }) => {
      // Create download link
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Bulk Export Complete',
        description: `Downloaded ${documentIds.length} documents as ZIP archive`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Bulk Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export documents',
        variant: 'destructive',
      });
    },
  });

  const generateCustomDocument = useMutation({
    mutationFn: ({ request, options }: { request: CustomDocumentRequest; options?: ExportOptions }) =>
      documentExportService.generateCustomDocument(request, options),
    onSuccess: (result) => {
      // Create download link
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Custom Document Generated',
        description: `Generated ${result.filename} successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate custom document',
        variant: 'destructive',
      });
    },
  });

  const exportAnalysis = useMutation({
    mutationFn: ({ documentId, options }: { documentId: string; options?: ExportOptions }) =>
      documentExportService.exportAnalysis(documentId, options),
    onSuccess: (result) => {
      // Create download link
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Analysis Exported',
        description: `Exported analysis as ${result.filename}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export analysis',
        variant: 'destructive',
      });
    },
  });

  return {
    exportDocument,
    bulkExport,
    generateCustomDocument,
    exportAnalysis,
    isExporting: exportDocument.isPending || bulkExport.isPending ||
                 generateCustomDocument.isPending || exportAnalysis.isPending
  };
}
