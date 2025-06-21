// Core type definitions for LawMattersSGv8

export type SubscriptionTier = 'free' | 'premium' | 'pro' | 'enterprise';

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type DocumentType = 'contract' | 'legal_brief' | 'court_filing' | 'agreement' | 'other';

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
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
  // Enhanced profile fields
  logo_url?: string;
  cover_image_url?: string;
  established_year?: number;
  firm_size?: 'solo' | 'small' | 'medium' | 'large';
  languages?: string[];
  fee_structure?: 'hourly' | 'fixed' | 'contingency' | 'mixed';
  consultation_fee?: number;
  accepts_legal_aid?: boolean;
  office_hours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  social_media?: {
    linkedin?: string;
    facebook?: string;
    twitter?: string;
  };
  certifications?: string[];
  awards?: string[];
  total_reviews?: number;
  response_time?: string; // e.g., "within 24 hours"
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



export interface LawFirmReview {
  id: string;
  law_firm_id: string;
  user_id: string;
  rating: number;
  title: string;
  content: string;
  helpful_count: number;
  verified_client: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  user?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface LawFirmReviewVote {
  id: string;
  review_id: string;
  user_id: string;
  is_helpful: boolean;
  created_at: string;
}

export interface LawFirmTeamMember {
  id: string;
  law_firm_id: string;
  name: string;
  title: string;
  bio?: string;
  photo_url?: string;
  email?: string;
  phone?: string;
  practice_areas: string[];
  years_experience?: number;
  education?: string[];
  bar_admissions?: string[];
  languages?: string[];
  specializations?: string[];
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LawFirmGalleryImage {
  id: string;
  law_firm_id: string;
  image_url: string;
  caption?: string;
  alt_text?: string;
  order_index: number;
  created_at: string;
}

export interface LawFirmBooking {
  id: string;
  law_firm_id: string;
  user_id: string;
  team_member_id?: string;
  consultation_type: 'initial' | 'follow_up' | 'document_review';
  preferred_date: string;
  preferred_time: string;
  duration_minutes: number;
  message?: string;
  contact_phone?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  booking_fee?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  user?: {
    full_name: string;
    email: string;
    phone?: string;
  };
  team_member?: LawFirmTeamMember;
}

// Legal Q&A System Types

export interface LegalQACategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  parent_id?: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  subcategories?: LegalQACategory[];
  question_count?: number;
}

export interface LegalQuestion {
  id: string;
  user_id: string;
  category_id?: string;
  title: string;
  content: string;
  tags: string[];
  urgency_level: 'low' | 'normal' | 'high' | 'urgent';
  location?: string;
  is_anonymous: boolean;
  status: 'open' | 'answered' | 'closed' | 'flagged';
  view_count: number;
  upvote_count: number;
  downvote_count: number;
  answer_count: number;
  has_expert_answer: boolean;
  has_ai_answer: boolean;
  featured: boolean;
  moderation_status: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderated_by?: string;
  moderated_at?: string;
  moderation_notes?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  category?: LegalQACategory;
  answers?: LegalAnswer[];
  user_vote?: 'upvote' | 'downvote';
  is_bookmarked?: boolean;
}

export interface LegalAnswer {
  id: string;
  question_id: string;
  user_id?: string;
  content: string;
  answer_type: 'community' | 'expert' | 'ai' | 'verified';
  is_accepted: boolean;
  upvote_count: number;
  downvote_count: number;
  helpful_count: number;
  expert_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;
  sources?: string[];
  disclaimer?: string;
  moderation_status: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderated_by?: string;
  moderated_at?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  expert?: LegalExpert;
  user_vote?: 'upvote' | 'downvote' | 'helpful';
  comments?: LegalQAComment[];
}

export interface LegalExpert {
  id: string;
  user_id: string;
  law_firm_id?: string;
  bar_number?: string;
  specializations: string[];
  years_experience?: number;
  education?: string[];
  certifications?: string[];
  languages: string[];
  verification_status: 'pending' | 'verified' | 'rejected' | 'suspended';
  verification_documents?: string[];
  verified_by?: string;
  verified_at?: string;
  bio?: string;
  expertise_score: number;
  answer_count: number;
  helpful_answer_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email: string;
  };
  law_firm?: {
    id: string;
    name: string;
    logo_url?: string;
  };
}

export interface LegalQAVote {
  id: string;
  user_id: string;
  question_id?: string;
  answer_id?: string;
  vote_type: 'upvote' | 'downvote' | 'helpful';
  created_at: string;
}

export interface LegalQAComment {
  id: string;
  user_id: string;
  question_id?: string;
  answer_id?: string;
  parent_id?: string;
  content: string;
  upvote_count: number;
  moderation_status: 'pending' | 'approved' | 'rejected' | 'flagged';
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  replies?: LegalQAComment[];
}

export interface LegalQABookmark {
  id: string;
  user_id: string;
  question_id?: string;
  answer_id?: string;
  created_at: string;
}

export interface LegalQAReport {
  id: string;
  reporter_id: string;
  question_id?: string;
  answer_id?: string;
  comment_id?: string;
  reason: 'spam' | 'inappropriate' | 'misinformation' | 'harassment' | 'copyright' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewed_by?: string;
  reviewed_at?: string;
  resolution_notes?: string;
  created_at: string;
}

// Q&A API Filter Types
export interface LegalQAFilters {
  category_id?: string;
  tags?: string[];
  status?: LegalQuestion['status'];
  urgency_level?: LegalQuestion['urgency_level'];
  has_expert_answer?: boolean;
  has_ai_answer?: boolean;
  featured?: boolean;
  location?: string;
  search?: string;
  sort_by?: 'newest' | 'oldest' | 'most_votes' | 'most_answers' | 'most_views';
  page?: number;
  limit?: number;
}

export interface LegalAnswerFilters {
  question_id?: string;
  answer_type?: LegalAnswer['answer_type'];
  expert_verified?: boolean;
  is_accepted?: boolean;
  sort_by?: 'newest' | 'oldest' | 'most_votes' | 'most_helpful';
}

// AI Answer Generation Types
export interface AIAnswerRequest {
  question_id: string;
  question_title: string;
  question_content: string;
  category?: string;
  tags?: string[];
  location?: string;
}

export interface AIAnswerResponse {
  content: string;
  sources?: string[];
  disclaimer: string;
  confidence_score?: number;
  suggested_experts?: string[];
}

export type UserRole = 'user' | 'admin' | 'moderator' | 'super_admin';

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role: UserRole;
  permission_id: string;
  created_at: string;
  permission?: Permission;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  granted: boolean;
  granted_by: string;
  created_at: string;
  permission?: Permission;
  granted_by_user?: {
    full_name: string;
    email: string;
  };
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
    role: UserRole;
  };
}

export interface UserWithPermissions extends Profile {
  role: UserRole;
  permissions?: {
    permission_name: string;
    granted_by_role: boolean;
    granted_individually: boolean;
  }[];
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
