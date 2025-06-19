// Core type definitions for LawMattersSGv8

export type SubscriptionTier = 'free' | 'basic' | 'premium' | 'enterprise';

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type DocumentType = 'contract' | 'legal_brief' | 'court_filing' | 'agreement' | 'other';

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  subscription_tier: SubscriptionTier;
  created_at: string;
  updated_at: string;
}

export interface UploadedDocument {
  id: string;
  user_id: string;
  filename: string;
  file_url: string;
  file_size: number;
  document_type: DocumentType;
  processing_status: ProcessingStatus;
  ocr_text?: string;
  ocr_quality_score?: number;
  document_structure: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DocumentEmbedding {
  id: string;
  document_id: string;
  chunk_text: string;
  chunk_index: number;
  embedding: number[];
  metadata: Record<string, any>;
  created_at: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  variables: string[];
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LawFirm {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  practice_areas: string[];
  rating: number;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminRole {
  id: string;
  name: 'super_admin' | 'admin' | 'moderator' | 'support';
  permissions: Permission[];
}

export interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

export interface BatchOperation {
  id: string;
  type: 'ocr' | 'embedding' | 'classification' | 'deletion';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  documentIds: string[];
  progress: number;
  errorLog?: string[];
  createdBy: string;
  createdAt: Date;
}

export interface DocumentAnalysis {
  summary: string;
  entities: string[];
  classification: string;
  legal_implications: string[];
  recommended_actions: string[];
}

export interface TemplateRequest {
  type: string;
  parties: Record<string, any>;
  terms: Record<string, any>;
  customRequirements?: string;
}

export interface AIUsageLog {
  id: string;
  user_id: string;
  operation_type: 'chat' | 'summarize' | 'extract-entities' | 'generate-template';
  tokens_used: number;
  cost: number;
  created_at: string;
}

export interface UserUsage {
  id: string;
  user_id: string;
  daily_ai_requests: number;
  monthly_ai_requests: number;
  daily_document_uploads: number;
  monthly_document_uploads: number;
  last_reset_date: string;
}
