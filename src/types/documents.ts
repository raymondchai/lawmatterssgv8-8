/**
 * Document types for the application
 */

export interface UploadedDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedAt: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  ocrText?: string;
  embeddings?: boolean;
  userId: string;
  isPublic: boolean;
  tags?: string[];
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    createdAt?: string;
    modifiedAt?: string;
    pageCount?: number;
    [key: string]: any;
  };
  sharedWith?: string[];
  downloadCount?: number;
  lastAccessedAt?: string;
}

export interface DocumentUploadRequest {
  file: File;
  isPublic?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface DocumentUpdateRequest {
  fileName?: string;
  isPublic?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface DocumentSearchRequest {
  query?: string;
  fileType?: string;
  tags?: string[];
  userId?: string;
  isPublic?: boolean;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface DocumentSearchResult {
  documents: UploadedDocument[];
  total: number;
  hasMore: boolean;
}

export interface DocumentAnalysisRequest {
  documentId: string;
  analysisType: 'summary' | 'key_points' | 'legal_review' | 'compliance_check';
  options?: {
    language?: string;
    jurisdiction?: string;
    focusAreas?: string[];
  };
}

export interface DocumentAnalysisResult {
  id: string;
  documentId: string;
  analysisType: string;
  result: {
    summary?: string;
    keyPoints?: string[];
    findings?: Array<{
      type: 'issue' | 'recommendation' | 'compliance' | 'risk';
      title: string;
      description: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      location?: {
        page?: number;
        section?: string;
        text?: string;
      };
    }>;
    score?: number;
    confidence?: number;
  };
  createdAt: string;
  processingTime?: number;
}

export interface DocumentShare {
  id: string;
  documentId: string;
  sharedBy: string;
  sharedWith: string;
  permission: 'view' | 'comment' | 'edit';
  shareToken?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  fileName: string;
  fileUrl: string;
  changes?: string;
  createdBy: string;
  createdAt: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  fileUrl: string;
  previewUrl?: string;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  downloadCount: number;
  rating?: number;
  tags: string[];
}

// Processing status types
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

// File type categories
export const FILE_TYPE_CATEGORIES = {
  PDF: 'application/pdf',
  WORD: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  EXCEL: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  POWERPOINT: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  TEXT: ['text/plain', 'text/csv', 'text/html'],
} as const;

// Supported file types for upload
export const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
] as const;

// Maximum file size (in bytes)
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// File type icons mapping
export const FILE_TYPE_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'application/msword': '📘',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📘',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'application/vnd.ms-powerpoint': '📈',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📈',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/gif': '🖼️',
  'image/webp': '🖼️',
  'text/plain': '📝',
  'text/csv': '📋',
  'text/html': '🌐',
  default: '📁'
};

// Document processing events
export interface DocumentProcessingEvent {
  type: 'upload_started' | 'upload_completed' | 'processing_started' | 'ocr_completed' | 'embeddings_generated' | 'processing_completed' | 'processing_failed';
  documentId: string;
  timestamp: string;
  data?: any;
  error?: string;
}

// Document statistics
export interface DocumentStats {
  totalDocuments: number;
  totalSize: number;
  byFileType: Record<string, number>;
  byStatus: Record<ProcessingStatus, number>;
  recentUploads: number;
  popularTags: Array<{ tag: string; count: number }>;
}
