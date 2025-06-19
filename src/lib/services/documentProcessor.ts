import { supabase } from '@/lib/supabase';
import { extractTextFromDocument, validateOCRQuality, cleanExtractedText, type OCRResult, type OCRProgress } from './ocr';
import { analyzeDocument, generateEmbedding, type DocumentAnalysis } from '@/lib/api/openai';
import type { UploadedDocument } from '@/types';

export interface ProcessingStatus {
  stage: 'uploading' | 'ocr' | 'analysis' | 'embedding' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
}

export interface DocumentProcessingResult {
  document: UploadedDocument;
  ocrResult: OCRResult;
  analysis: DocumentAnalysis;
  embeddingId?: string;
}

/**
 * Process a document through the complete pipeline:
 * 1. OCR text extraction
 * 2. AI analysis
 * 3. Generate embeddings
 * 4. Update database
 */
export async function processDocument(
  file: File,
  documentId: string,
  onProgress?: (status: ProcessingStatus) => void
): Promise<DocumentProcessingResult> {
  try {
    // Stage 1: OCR Processing
    onProgress?.({
      stage: 'ocr',
      progress: 0,
      message: 'Starting text extraction...'
    });

    const ocrResult = await extractTextFromDocument(file, (ocrProgress) => {
      onProgress?.({
        stage: 'ocr',
        progress: ocrProgress.progress * 0.4, // OCR takes 40% of total progress
        message: ocrProgress.message || 'Extracting text...'
      });
    });

    // Validate OCR quality
    const qualityCheck = validateOCRQuality(ocrResult);
    const cleanedText = cleanExtractedText(ocrResult.text);

    // Update document with OCR results
    const { error: ocrUpdateError } = await supabase
      .from('uploaded_documents')
      .update({
        ocr_text: cleanedText,
        ocr_quality_score: qualityCheck.qualityScore,
        processing_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (ocrUpdateError) {
      throw new Error(`Failed to update OCR results: ${ocrUpdateError.message}`);
    }

    // Stage 2: AI Analysis
    onProgress?.({
      stage: 'analysis',
      progress: 40,
      message: 'Analyzing document content...'
    });

    const analysis = await analyzeDocument(cleanedText);

    // Update document with analysis results
    const { error: analysisUpdateError } = await supabase
      .from('uploaded_documents')
      .update({
        document_structure: {
          analysis,
          ocrQuality: qualityCheck,
          metadata: ocrResult.metadata
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (analysisUpdateError) {
      throw new Error(`Failed to update analysis results: ${analysisUpdateError.message}`);
    }

    // Stage 3: Generate Embeddings
    onProgress?.({
      stage: 'embedding',
      progress: 70,
      message: 'Generating embeddings for search...'
    });

    let embeddingId: string | undefined;

    if (cleanedText.length > 50) { // Only generate embeddings for substantial text
      try {
        // Split text into chunks for embedding
        const chunks = splitTextIntoChunks(cleanedText, 1000);
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const embeddingResult = await generateEmbedding(chunk);
          
          // Store embedding in database
          const { data: embeddingData, error: embeddingError } = await supabase
            .from('document_embeddings')
            .insert({
              document_id: documentId,
              chunk_text: chunk,
              chunk_index: i,
              embedding: embeddingResult.embedding,
              metadata: {
                usage: embeddingResult.usage,
                chunkLength: chunk.length,
                totalChunks: chunks.length
              }
            })
            .select('id')
            .single();

          if (embeddingError) {
            console.error('Failed to store embedding:', embeddingError);
          } else if (i === 0) {
            embeddingId = embeddingData.id;
          }

          // Update progress
          const embeddingProgress = 70 + (i + 1) / chunks.length * 20;
          onProgress?.({
            stage: 'embedding',
            progress: embeddingProgress,
            message: `Processing chunk ${i + 1} of ${chunks.length}...`
          });
        }
      } catch (embeddingError) {
        console.error('Embedding generation failed:', embeddingError);
        // Continue without embeddings - not critical for basic functionality
      }
    }

    // Stage 4: Final Update
    onProgress?.({
      stage: 'completed',
      progress: 95,
      message: 'Finalizing document processing...'
    });

    // Mark document as completed
    const { data: finalDocument, error: finalUpdateError } = await supabase
      .from('uploaded_documents')
      .update({
        processing_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single();

    if (finalUpdateError) {
      throw new Error(`Failed to finalize document: ${finalUpdateError.message}`);
    }

    onProgress?.({
      stage: 'completed',
      progress: 100,
      message: 'Document processing completed successfully!'
    });

    return {
      document: finalDocument,
      ocrResult,
      analysis,
      embeddingId
    };

  } catch (error) {
    console.error('Document processing failed:', error);
    
    // Mark document as failed
    await supabase
      .from('uploaded_documents')
      .update({
        processing_status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    onProgress?.({
      stage: 'error',
      progress: 0,
      message: 'Document processing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
}

/**
 * Split text into chunks for embedding generation
 */
function splitTextIntoChunks(text: string, maxChunkSize: number = 1000): string[] {
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
  
  // If no sentences found, split by words
  if (chunks.length === 0) {
    const words = text.split(/\s+/);
    let currentChunk = '';
    
    for (const word of words) {
      if (currentChunk.length + word.length + 1 <= maxChunkSize) {
        currentChunk += (currentChunk ? ' ' : '') + word;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = word;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
  }
  
  return chunks.filter(chunk => chunk.trim().length > 0);
}

/**
 * Reprocess a document (useful for failed documents or when improving algorithms)
 */
export async function reprocessDocument(
  documentId: string,
  onProgress?: (status: ProcessingStatus) => void
): Promise<DocumentProcessingResult> {
  // Get document info
  const { data: document, error: docError } = await supabase
    .from('uploaded_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (docError || !document) {
    throw new Error('Document not found');
  }

  // Get file from storage
  const { data: fileData, error: fileError } = await supabase.storage
    .from('documents')
    .download(document.file_url.split('/').pop() || '');

  if (fileError || !fileData) {
    throw new Error('Failed to download document file');
  }

  // Convert blob to file
  const file = new File([fileData], document.filename, {
    type: document.document_type
  });

  // Clear existing embeddings
  await supabase
    .from('document_embeddings')
    .delete()
    .eq('document_id', documentId);

  // Reset document status
  await supabase
    .from('uploaded_documents')
    .update({
      processing_status: 'pending',
      ocr_text: null,
      ocr_quality_score: null,
      document_structure: {},
      updated_at: new Date().toISOString()
    })
    .eq('id', documentId);

  // Process the document
  return processDocument(file, documentId, onProgress);
}
