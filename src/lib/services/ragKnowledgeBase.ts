/**
 * RAG Knowledge Base Service
 * Manages the creation, storage, and retrieval of knowledge for RAG system
 */

import { supabase } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/api/openai';
import { logError, logPerformance } from '@/lib/services/productionMonitoring';

export interface KnowledgeChunk {
  id: string;
  content: string;
  title: string;
  source: string;
  category: 'legal_document' | 'case_law' | 'statute' | 'regulation' | 'faq' | 'guide';
  metadata: {
    jurisdiction?: string;
    practice_area?: string;
    date_created?: string;
    authority?: string;
    tags?: string[];
  };
  embedding?: number[];
  similarity?: number;
}

export interface RAGSearchOptions {
  query: string;
  category?: KnowledgeChunk['category'];
  practiceArea?: string;
  jurisdiction?: string;
  maxResults?: number;
  similarityThreshold?: number;
}

export interface RAGResponse {
  answer: string;
  sources: KnowledgeChunk[];
  confidence: number;
  reasoning: string;
}

class RAGKnowledgeBaseService {
  private readonly CHUNK_SIZE = 1000; // Characters per chunk
  private readonly OVERLAP_SIZE = 200; // Overlap between chunks
  private readonly DEFAULT_SIMILARITY_THRESHOLD = 0.7;
  private readonly DEFAULT_MAX_RESULTS = 5;

  /**
   * Add knowledge to the RAG system
   */
  async addKnowledge(
    content: string,
    title: string,
    source: string,
    category: KnowledgeChunk['category'],
    metadata: KnowledgeChunk['metadata'] = {}
  ): Promise<string[]> {
    const startTime = Date.now();
    
    try {
      // Split content into chunks
      const chunks = this.splitIntoChunks(content);
      const chunkIds: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Generate embedding for the chunk
        const { embedding } = await generateEmbedding(chunk);
        
        // Store in database
        const { data, error } = await supabase
          .from('knowledge_base')
          .insert({
            content: chunk,
            title: `${title} (Part ${i + 1}/${chunks.length})`,
            source,
            category,
            metadata: {
              ...metadata,
              chunk_index: i,
              total_chunks: chunks.length,
              chunk_size: chunk.length
            },
            embedding
          })
          .select('id')
          .single();

        if (error) {
          logError(error, 'rag_add_knowledge', 'high');
          throw new Error(`Failed to store knowledge chunk: ${error.message}`);
        }

        chunkIds.push(data.id);
      }

      const duration = Date.now() - startTime;
      logPerformance('rag_add_knowledge', duration, `Added ${chunks.length} chunks`);

      return chunkIds;
    } catch (error) {
      logError(error as Error, 'rag_add_knowledge', 'high');
      throw error;
    }
  }

  /**
   * Search the knowledge base
   */
  async searchKnowledge(options: RAGSearchOptions): Promise<KnowledgeChunk[]> {
    const startTime = Date.now();
    
    try {
      const {
        query,
        category,
        practiceArea,
        jurisdiction,
        maxResults = this.DEFAULT_MAX_RESULTS,
        similarityThreshold = this.DEFAULT_SIMILARITY_THRESHOLD
      } = options;

      // Generate embedding for the query
      const { embedding: queryEmbedding } = await generateEmbedding(query);

      // Build the RPC call parameters
      const rpcParams: any = {
        query_embedding: queryEmbedding,
        similarity_threshold: similarityThreshold,
        match_count: maxResults
      };

      // Add filters if provided
      if (category) rpcParams.category_filter = category;
      if (practiceArea) rpcParams.practice_area_filter = practiceArea;
      if (jurisdiction) rpcParams.jurisdiction_filter = jurisdiction;

      // Call the database function
      const { data, error } = await supabase.rpc('search_knowledge_base', rpcParams);

      if (error) {
        logError(error, 'rag_search_knowledge', 'medium');
        throw new Error(`Knowledge search failed: ${error.message}`);
      }

      const duration = Date.now() - startTime;
      logPerformance('rag_search_knowledge', duration, `Found ${data?.length || 0} results`);

      return data || [];
    } catch (error) {
      logError(error as Error, 'rag_search_knowledge', 'medium');
      throw error;
    }
  }

  /**
   * Generate RAG response
   */
  async generateResponse(
    question: string,
    searchOptions: Partial<RAGSearchOptions> = {}
  ): Promise<RAGResponse> {
    const startTime = Date.now();
    
    try {
      // Search for relevant knowledge
      const relevantChunks = await this.searchKnowledge({
        query: question,
        ...searchOptions
      });

      if (relevantChunks.length === 0) {
        return {
          answer: "I don't have enough information in my knowledge base to answer this question accurately. Please consider adding more relevant legal documents or contact a legal professional.",
          sources: [],
          confidence: 0.1,
          reasoning: "No relevant knowledge found in the database."
        };
      }

      // Prepare context for the AI
      const context = relevantChunks
        .map((chunk, index) => `[Source ${index + 1}: ${chunk.title}]\n${chunk.content}`)
        .join('\n\n');

      // Generate response using OpenAI
      const response = await this.generateAIResponse(question, context, relevantChunks);

      const duration = Date.now() - startTime;
      logPerformance('rag_generate_response', duration, `Used ${relevantChunks.length} sources`);

      return response;
    } catch (error) {
      logError(error as Error, 'rag_generate_response', 'high');
      throw error;
    }
  }

  /**
   * Split content into overlapping chunks
   */
  private splitIntoChunks(content: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < content.length) {
      let end = start + this.CHUNK_SIZE;
      
      // If we're not at the end, try to break at a sentence boundary
      if (end < content.length) {
        const lastPeriod = content.lastIndexOf('.', end);
        const lastNewline = content.lastIndexOf('\n', end);
        const breakPoint = Math.max(lastPeriod, lastNewline);
        
        if (breakPoint > start + this.CHUNK_SIZE * 0.5) {
          end = breakPoint + 1;
        }
      }

      chunks.push(content.slice(start, end).trim());
      start = end - this.OVERLAP_SIZE;
    }

    return chunks.filter(chunk => chunk.length > 50); // Filter out very small chunks
  }

  /**
   * Generate AI response with context
   */
  private async generateAIResponse(
    question: string,
    context: string,
    sources: KnowledgeChunk[]
  ): Promise<RAGResponse> {
    const { openai } = await import('@/lib/api/openai');
    
    const systemPrompt = `You are a legal AI assistant for Singapore law. Use the provided context to answer questions accurately and cite your sources.

IMPORTANT GUIDELINES:
1. Only use information from the provided context
2. If the context doesn't contain enough information, say so clearly
3. Always cite which sources you're using
4. Provide practical, actionable advice when appropriate
5. Include relevant legal disclaimers
6. Structure your response clearly with headings if needed

Context:
${context}`;

    const userPrompt = `Question: ${question}

Please provide a comprehensive answer based on the context provided. Include:
1. Direct answer to the question
2. Relevant legal principles
3. Practical implications
4. Source citations
5. Any important disclaimers`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 1500
      });

      const answer = response.choices[0]?.message?.content || '';
      
      // Calculate confidence based on source relevance
      const avgSimilarity = sources.reduce((sum, source) => sum + (source.similarity || 0), 0) / sources.length;
      const confidence = Math.min(0.9, avgSimilarity + 0.1);

      return {
        answer,
        sources,
        confidence,
        reasoning: `Answer generated using ${sources.length} relevant sources with average similarity of ${(avgSimilarity * 100).toFixed(1)}%`
      };
    } catch (error) {
      logError(error as Error, 'rag_ai_response', 'high');
      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * Update knowledge chunk
   */
  async updateKnowledge(
    id: string,
    updates: Partial<Pick<KnowledgeChunk, 'content' | 'title' | 'metadata'>>
  ): Promise<void> {
    try {
      let updateData: any = { ...updates };

      // If content is updated, regenerate embedding
      if (updates.content) {
        const { embedding } = await generateEmbedding(updates.content);
        updateData.embedding = embedding;
      }

      const { error } = await supabase
        .from('knowledge_base')
        .update(updateData)
        .eq('id', id);

      if (error) {
        logError(error, 'rag_update_knowledge', 'medium');
        throw new Error(`Failed to update knowledge: ${error.message}`);
      }
    } catch (error) {
      logError(error as Error, 'rag_update_knowledge', 'medium');
      throw error;
    }
  }

  /**
   * Delete knowledge chunk
   */
  async deleteKnowledge(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id);

      if (error) {
        logError(error, 'rag_delete_knowledge', 'medium');
        throw new Error(`Failed to delete knowledge: ${error.message}`);
      }
    } catch (error) {
      logError(error as Error, 'rag_delete_knowledge', 'medium');
      throw error;
    }
  }

  /**
   * Get knowledge statistics
   */
  async getKnowledgeStats(): Promise<{
    totalChunks: number;
    categoryCounts: Record<string, number>;
    practiceAreaCounts: Record<string, number>;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_knowledge_base_stats');
      
      if (error) {
        logError(error, 'rag_get_stats', 'low');
        throw new Error(`Failed to get knowledge stats: ${error.message}`);
      }

      return data || { totalChunks: 0, categoryCounts: {}, practiceAreaCounts: {} };
    } catch (error) {
      logError(error as Error, 'rag_get_stats', 'low');
      throw error;
    }
  }
}

// Export singleton instance
export const ragKnowledgeBase = new RAGKnowledgeBaseService();

// Export types and main functions
export type { KnowledgeChunk, RAGSearchOptions, RAGResponse };
export const {
  addKnowledge,
  searchKnowledge,
  generateResponse,
  updateKnowledge,
  deleteKnowledge,
  getKnowledgeStats
} = ragKnowledgeBase;
