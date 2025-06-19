export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          subscription_tier: 'free' | 'basic' | 'premium' | 'enterprise'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          subscription_tier?: 'free' | 'basic' | 'premium' | 'enterprise'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          subscription_tier?: 'free' | 'basic' | 'premium' | 'enterprise'
          created_at?: string
          updated_at?: string
        }
      }
      uploaded_documents: {
        Row: {
          id: string
          user_id: string
          filename: string
          file_url: string
          file_size: number
          document_type: string
          processing_status: 'pending' | 'processing' | 'completed' | 'failed'
          ocr_text: string | null
          ocr_quality_score: number | null
          document_structure: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          file_url: string
          file_size: number
          document_type: string
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          ocr_text?: string | null
          ocr_quality_score?: number | null
          document_structure?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          file_url?: string
          file_size?: number
          document_type?: string
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          ocr_text?: string | null
          ocr_quality_score?: number | null
          document_structure?: Json
          created_at?: string
          updated_at?: string
        }
      }
      document_embeddings: {
        Row: {
          id: string
          document_id: string
          chunk_text: string
          chunk_index: number
          embedding: number[] | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          chunk_text: string
          chunk_index: number
          embedding?: number[] | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          chunk_text?: string
          chunk_index?: number
          embedding?: number[] | null
          metadata?: Json
          created_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          name: string
          description: string
          category: string
          content: string
          variables: string[]
          is_public: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          category: string
          content: string
          variables: string[]
          is_public?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          category?: string
          content?: string
          variables?: string[]
          is_public?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      law_firms: {
        Row: {
          id: string
          name: string
          description: string
          address: string
          phone: string
          email: string
          website: string | null
          practice_areas: string[]
          rating: number
          verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          address: string
          phone: string
          email: string
          website?: string | null
          practice_areas: string[]
          rating?: number
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          address?: string
          phone?: string
          email?: string
          website?: string | null
          practice_areas?: string[]
          rating?: number
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      ai_usage_logs: {
        Row: {
          id: string
          user_id: string
          operation_type: 'chat' | 'summarize' | 'extract-entities' | 'generate-template'
          tokens_used: number
          cost: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          operation_type: 'chat' | 'summarize' | 'extract-entities' | 'generate-template'
          tokens_used: number
          cost: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          operation_type?: 'chat' | 'summarize' | 'extract-entities' | 'generate-template'
          tokens_used?: number
          cost?: number
          created_at?: string
        }
      }
      user_usage: {
        Row: {
          id: string
          user_id: string
          daily_ai_requests: number
          monthly_ai_requests: number
          daily_document_uploads: number
          monthly_document_uploads: number
          last_reset_date: string
        }
        Insert: {
          id?: string
          user_id: string
          daily_ai_requests?: number
          monthly_ai_requests?: number
          daily_document_uploads?: number
          monthly_document_uploads?: number
          last_reset_date?: string
        }
        Update: {
          id?: string
          user_id?: string
          daily_ai_requests?: number
          monthly_ai_requests?: number
          daily_document_uploads?: number
          monthly_document_uploads?: number
          last_reset_date?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_usage_limits: {
        Args: {
          user_id: string
          operation_type: string
        }
        Returns: boolean
      }
      search_similar_chunks: {
        Args: {
          query_embedding: number[]
          similarity_threshold: number
          match_count: number
          user_filter: string
        }
        Returns: {
          id: string
          document_id: string
          chunk_text: string
          similarity: number
        }[]
      }
    }
    Enums: {
      subscription_tier: 'free' | 'basic' | 'premium' | 'enterprise'
      inquiry_status: 'pending' | 'processing' | 'completed' | 'failed'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
