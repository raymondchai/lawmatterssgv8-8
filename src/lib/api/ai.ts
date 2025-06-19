/**
 * AI API functions for interacting with Supabase Edge Functions
 */

import { supabase } from '@/lib/supabase';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  documentIds?: string[];
  useRAG?: boolean;
}

export interface ChatResponse {
  response: string;
  conversationId: string;
}

export interface DocumentProcessingRequest {
  documentId: string;
  operation: 'extract-text' | 'generate-embeddings' | 'classify' | 'summarize';
  options?: Record<string, any>;
}

export interface DocumentProcessingResponse {
  success: boolean;
  result: any;
}

export interface TemplateGenerationRequest {
  templateType: string;
  description: string;
  variables?: Record<string, any>;
  customInstructions?: string;
}

export interface TemplateGenerationResponse {
  success: boolean;
  template: any;
  generatedContent: string;
}

class AIApi {
  private async callEdgeFunction(
    functionName: string,
    payload: any
  ): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Authentication required');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Send a chat message to the AI
   */
  async sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
    // Check usage limit before making the request
    const { usageTrackingService } = await import('@/lib/services/usageTracking');
    const usageCheck = await usageTrackingService.checkAndIncrementUsage('ai_query', undefined, {
      operation: 'chat',
      message_length: request.message.length,
      document_ids: request.documentIds,
      use_rag: request.useRAG
    });

    if (!usageCheck.allowed) {
      throw new Error(`Usage limit exceeded. You have used ${usageCheck.limit?.current}/${usageCheck.limit?.limit} AI queries this month. Please upgrade your plan to continue.`);
    }

    return this.callEdgeFunction('ai-chat', request);
  }

  /**
   * Process a document with AI
   */
  async processDocument(request: DocumentProcessingRequest): Promise<DocumentProcessingResponse> {
    // Check usage limit for document operations
    const { usageTrackingService } = await import('@/lib/services/usageTracking');
    const usageCheck = await usageTrackingService.checkAndIncrementUsage('document_upload', request.documentId, {
      operation: request.operation,
      options: request.options
    });

    if (!usageCheck.allowed) {
      throw new Error(`Usage limit exceeded. You have used ${usageCheck.limit?.current}/${usageCheck.limit?.limit} document operations this month. Please upgrade your plan to continue.`);
    }

    return this.callEdgeFunction('document-processor', request);
  }

  /**
   * Generate a legal template
   */
  async generateTemplate(request: TemplateGenerationRequest): Promise<TemplateGenerationResponse> {
    // Check usage limit for template generation
    const { usageTrackingService } = await import('@/lib/services/usageTracking');
    const usageCheck = await usageTrackingService.checkAndIncrementUsage('ai_query', undefined, {
      operation: 'template_generation',
      template_type: request.templateType,
      description_length: request.description.length
    });

    if (!usageCheck.allowed) {
      throw new Error(`Usage limit exceeded. You have used ${usageCheck.limit?.current}/${usageCheck.limit?.limit} AI queries this month. Please upgrade your plan to continue.`);
    }

    return this.callEdgeFunction('template-generator', request);
  }

  /**
   * Extract text from a document
   */
  async extractText(documentId: string): Promise<{ extractedText: string }> {
    const response = await this.processDocument({
      documentId,
      operation: 'extract-text',
    });
    return response.result;
  }

  /**
   * Generate embeddings for a document
   */
  async generateEmbeddings(documentId: string): Promise<{ embedding: number[] }> {
    const response = await this.processDocument({
      documentId,
      operation: 'generate-embeddings',
    });
    return response.result;
  }

  /**
   * Classify a document
   */
  async classifyDocument(documentId: string): Promise<{
    type: string;
    confidence: number;
    categories: string[];
  }> {
    const response = await this.processDocument({
      documentId,
      operation: 'classify',
    });
    return response.result;
  }

  /**
   * Summarize a document
   */
  async summarizeDocument(documentId: string): Promise<{ summary: string }> {
    const response = await this.processDocument({
      documentId,
      operation: 'summarize',
    });
    return response.result;
  }

  /**
   * Ask a question about specific documents (RAG)
   */
  async askDocumentQuestion(
    question: string,
    documentIds: string[],
    conversationId?: string
  ): Promise<ChatResponse> {
    return this.sendChatMessage({
      message: question,
      documentIds,
      useRAG: true,
      conversationId,
    });
  }

  /**
   * Get chat conversation history
   */
  async getChatHistory(conversationId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch chat history: ${error.message}`);
    }

    return data.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.created_at,
    }));
  }

  /**
   * Get user's AI usage statistics
   */
  async getUsageStats(periodDays: number = 30): Promise<{
    operation: string;
    count: number;
    lastUsed: string;
  }[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Authentication required');
    }

    const { data, error } = await supabase.rpc('get_user_usage_stats', {
      user_id_param: user.id,
      period_days: periodDays,
    });

    if (error) {
      throw new Error(`Failed to fetch usage stats: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Check if user can perform an operation (usage limits)
   */
  async checkUsageLimit(operation: string): Promise<{
    allowed: boolean;
    limit: number;
    used: number;
  }> {
    const { usageTrackingService } = await import('@/lib/services/usageTracking');

    // Map operation to resource type
    let resourceType: 'ai_query' | 'document_upload' | 'document_download' | 'custom_document';

    switch (operation) {
      case 'ai_chat':
      case 'chat':
      case 'summarize':
      case 'extract-entities':
      case 'generate-template':
        resourceType = 'ai_query';
        break;
      case 'document_analysis':
      case 'document_upload':
        resourceType = 'document_upload';
        break;
      default:
        resourceType = 'ai_query';
    }

    const usageLimit = await usageTrackingService.checkUsageLimit(resourceType);

    return {
      allowed: usageLimit.allowed,
      limit: usageLimit.limit,
      used: usageLimit.current,
    };
  }
}

// Export singleton instance
export const aiApi = new AIApi();

// Export individual functions for convenience
export const {
  sendChatMessage,
  processDocument,
  generateTemplate,
  extractText,
  generateEmbeddings,
  classifyDocument,
  summarizeDocument,
  askDocumentQuestion,
  getChatHistory,
  getUsageStats,
  checkUsageLimit,
} = aiApi;
