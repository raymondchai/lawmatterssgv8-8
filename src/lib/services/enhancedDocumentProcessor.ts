import { supabase } from '@/lib/supabase';
import { usageTrackingService } from '@/lib/services/usageTracking';
import { extractTextFromDocument, validateOCRQuality, cleanExtractedText, type OCRResult } from './ocr';
import { analyzeDocument, generateEmbedding, type DocumentAnalysis } from '@/lib/api/openai';
import type { UploadedDocument } from '@/types';

export interface EnhancedProcessingStatus {
  stage: 'initializing' | 'ocr' | 'analysis' | 'embedding' | 'finalizing' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
  details?: {
    ocrQuality?: number;
    textLength?: number;
    embeddingChunks?: number;
    processingTime?: number;
  };
}

export interface DocumentProcessingOptions {
  skipOCR?: boolean;
  skipAnalysis?: boolean;
  skipEmbedding?: boolean;
  customAnalysisPrompt?: string;
  chunkSize?: number;
  retryAttempts?: number;
}

export interface EnhancedDocumentProcessingResult {
  document: UploadedDocument;
  ocrResult?: OCRResult;
  analysis?: DocumentAnalysis;
  embeddingIds?: string[];
  processingTime: number;
  qualityMetrics: {
    ocrQuality: number;
    textLength: number;
    embeddingChunks: number;
  };
}

class EnhancedDocumentProcessor {
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 second

  /**
   * Process a document with enhanced error handling and progress tracking
   */
  async processDocument(
    file: File,
    documentId: string,
    options: DocumentProcessingOptions = {},
    onProgress?: (status: EnhancedProcessingStatus) => void
  ): Promise<EnhancedDocumentProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Initialize processing
      onProgress?.({
        stage: 'initializing',
        progress: 0,
        message: 'Initializing document processing...'
      });

      // Check usage limits
      await this.checkUsageLimits();

      // Update document status
      await this.updateDocumentStatus(documentId, 'processing');

      let ocrResult: OCRResult | undefined;
      let analysis: DocumentAnalysis | undefined;
      let embeddingIds: string[] = [];

      // Stage 1: OCR Processing (if not skipped)
      if (!options.skipOCR) {
        ocrResult = await this.performOCR(file, onProgress);
      }

      // Stage 2: AI Analysis (if not skipped)
      if (!options.skipAnalysis && ocrResult) {
        analysis = await this.performAnalysis(
          ocrResult.text,
          documentId,
          options.customAnalysisPrompt,
          onProgress
        );
      }

      // Stage 3: Generate Embeddings (if not skipped)
      if (!options.skipEmbedding && ocrResult) {
        embeddingIds = await this.generateEmbeddings(
          ocrResult.text,
          documentId,
          options.chunkSize,
          onProgress
        );
      }

      // Stage 4: Finalize
      onProgress?.({
        stage: 'finalizing',
        progress: 95,
        message: 'Finalizing document processing...'
      });

      const document = await this.finalizeProcessing(
        documentId,
        ocrResult,
        analysis,
        embeddingIds
      );

      const processingTime = Date.now() - startTime;

      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: 'Document processing completed successfully!',
        details: {
          processingTime,
          ocrQuality: ocrResult?.qualityScore || 0,
          textLength: ocrResult?.text.length || 0,
          embeddingChunks: embeddingIds.length
        }
      });

      return {
        document,
        ocrResult,
        analysis,
        embeddingIds,
        processingTime,
        qualityMetrics: {
          ocrQuality: ocrResult?.qualityScore || 0,
          textLength: ocrResult?.text.length || 0,
          embeddingChunks: embeddingIds.length
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Update document status to failed
      await this.updateDocumentStatus(documentId, 'failed');

      onProgress?.({
        stage: 'error',
        progress: 0,
        message: 'Document processing failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: { processingTime }
      });

      throw error;
    }
  }

  /**
   * Check usage limits before processing
   */
  private async checkUsageLimits(): Promise<void> {
    const usageCheck = await usageTrackingService.checkUsageLimit('ai_query');
    
    if (!usageCheck.allowed) {
      throw new Error(
        `AI processing limit exceeded. You have used ${usageCheck.current}/${usageCheck.limit} AI queries this month. Please upgrade your plan to continue.`
      );
    }
  }

  /**
   * Perform OCR with retry logic
   */
  private async performOCR(
    file: File,
    onProgress?: (status: EnhancedProcessingStatus) => void
  ): Promise<OCRResult> {
    onProgress?.({
      stage: 'ocr',
      progress: 10,
      message: 'Extracting text from document...'
    });

    return await this.withRetry(async () => {
      const ocrResult = await extractTextFromDocument(file, (progress) => {
        onProgress?.({
          stage: 'ocr',
          progress: 10 + (progress.progress * 0.3), // OCR takes 30% of total progress
          message: progress.message || 'Extracting text...'
        });
      });

      const qualityCheck = validateOCRQuality(ocrResult);
      const cleanedText = cleanExtractedText(ocrResult.text);

      return {
        ...ocrResult,
        text: cleanedText,
        qualityScore: qualityCheck.qualityScore
      };
    }, 'OCR processing');
  }

  /**
   * Perform AI analysis with retry logic
   */
  private async performAnalysis(
    text: string,
    documentId: string,
    customPrompt?: string,
    onProgress?: (status: EnhancedProcessingStatus) => void
  ): Promise<DocumentAnalysis> {
    onProgress?.({
      stage: 'analysis',
      progress: 40,
      message: 'Analyzing document content with AI...'
    });

    return await this.withRetry(async () => {
      const analysis = await analyzeDocument(text, customPrompt);

      // Track AI usage
      await usageTrackingService.incrementUsage('ai_query', documentId, {
        operation: 'document_analysis',
        text_length: text.length,
        custom_prompt: !!customPrompt
      });

      return analysis;
    }, 'AI analysis');
  }

  /**
   * Generate embeddings with retry logic
   */
  private async generateEmbeddings(
    text: string,
    documentId: string,
    chunkSize: number = 1000,
    onProgress?: (status: EnhancedProcessingStatus) => void
  ): Promise<string[]> {
    onProgress?.({
      stage: 'embedding',
      progress: 70,
      message: 'Generating embeddings for search...'
    });

    return await this.withRetry(async () => {
      const chunks = this.splitTextIntoChunks(text, chunkSize);
      const embeddingIds: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await generateEmbedding(chunk);

        const { data, error } = await supabase
          .from('document_embeddings')
          .insert({
            document_id: documentId,
            chunk_text: chunk,
            chunk_index: i,
            embedding: embedding,
            metadata: {
              chunk_size: chunk.length,
              total_chunks: chunks.length
            }
          })
          .select('id')
          .single();

        if (error) throw error;
        embeddingIds.push(data.id);

        // Update progress
        const progress = 70 + ((i + 1) / chunks.length) * 20;
        onProgress?.({
          stage: 'embedding',
          progress,
          message: `Generated embedding ${i + 1}/${chunks.length}...`
        });
      }

      return embeddingIds;
    }, 'Embedding generation');
  }

  /**
   * Finalize document processing
   */
  private async finalizeProcessing(
    documentId: string,
    ocrResult?: OCRResult,
    analysis?: DocumentAnalysis,
    embeddingIds?: string[]
  ): Promise<UploadedDocument> {
    const { data, error } = await supabase
      .from('uploaded_documents')
      .update({
        processing_status: 'completed',
        ocr_text: ocrResult?.text,
        ocr_quality_score: ocrResult?.qualityScore,
        document_structure: {
          analysis,
          ocrQuality: ocrResult?.qualityScore,
          embeddingCount: embeddingIds?.length || 0,
          processedAt: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;
    return data as UploadedDocument;
  }

  /**
   * Update document status
   */
  private async updateDocumentStatus(
    documentId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed'
  ): Promise<void> {
    const { error } = await supabase
      .from('uploaded_documents')
      .update({
        processing_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (error) throw error;
  }

  /**
   * Retry wrapper for operations
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === this.retryAttempts) {
          throw new Error(`${operationName} failed after ${this.retryAttempts} attempts: ${lastError.message}`);
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }

    throw lastError!;
  }

  /**
   * Split text into chunks for embedding
   */
  private splitTextIntoChunks(text: string, maxChunkSize: number = 1000): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      if (currentChunk.length + trimmedSentence.length + 1 <= maxChunkSize) {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
        }
        currentChunk = trimmedSentence;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }
    
    return chunks;
  }
}

// Export singleton instance
export const enhancedDocumentProcessor = new EnhancedDocumentProcessor();

// Export types
export type { EnhancedProcessingStatus, DocumentProcessingOptions, EnhancedDocumentProcessingResult };
