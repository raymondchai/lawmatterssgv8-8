import { supabase } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/api/openai';
import type { UploadedDocument } from '@/types';

export interface SearchResult {
  id: string;
  document_id: string;
  chunk_text: string;
  similarity: number;
  document?: UploadedDocument;
}

export interface SemanticSearchOptions {
  query: string;
  userId?: string;
  similarityThreshold?: number;
  maxResults?: number;
  documentIds?: string[];
}

export interface TextSearchOptions {
  query: string;
  userId: string;
  documentType?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface CombinedSearchResult {
  semanticResults: SearchResult[];
  textResults: UploadedDocument[];
  totalResults: number;
}

/**
 * Perform semantic search using vector embeddings
 */
export async function semanticSearch(options: SemanticSearchOptions): Promise<SearchResult[]> {
  const {
    query,
    userId,
    similarityThreshold = 0.7,
    maxResults = 10,
    documentIds
  } = options;

  try {
    // Generate embedding for the search query
    const { embedding } = await generateEmbedding(query);

    // Perform vector similarity search
    const { data, error } = await supabase.rpc('search_similar_chunks', {
      query_embedding: embedding,
      similarity_threshold: similarityThreshold,
      match_count: maxResults,
      user_filter: userId || null
    });

    if (error) {
      console.error('Semantic search error:', error);
      throw new Error('Failed to perform semantic search');
    }

    // Filter by document IDs if specified
    let results = data || [];
    if (documentIds && documentIds.length > 0) {
      results = results.filter((result: any) => 
        documentIds.includes(result.document_id)
      );
    }

    // Fetch document details for each result
    const enrichedResults = await Promise.all(
      results.map(async (result: any) => {
        const { data: document } = await supabase
          .from('uploaded_documents')
          .select('*')
          .eq('id', result.document_id)
          .single();

        return {
          id: result.id,
          document_id: result.document_id,
          chunk_text: result.chunk_text,
          similarity: result.similarity,
          document: document || undefined
        };
      })
    );

    return enrichedResults;
  } catch (error) {
    console.error('Semantic search failed:', error);
    throw error;
  }
}

/**
 * Perform text-based search using full-text search
 */
export async function textSearch(options: TextSearchOptions): Promise<UploadedDocument[]> {
  const { query, userId, documentType, dateRange } = options;

  try {
    let queryBuilder = supabase
      .from('uploaded_documents')
      .select('*')
      .eq('user_id', userId)
      .textSearch('ocr_text', query, {
        type: 'websearch',
        config: 'english'
      });

    // Add document type filter
    if (documentType) {
      queryBuilder = queryBuilder.eq('document_type', documentType);
    }

    // Add date range filter
    if (dateRange) {
      queryBuilder = queryBuilder
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
    }

    // Order by relevance and creation date
    queryBuilder = queryBuilder.order('created_at', { ascending: false });

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Text search error:', error);
      throw new Error('Failed to perform text search');
    }

    return data || [];
  } catch (error) {
    console.error('Text search failed:', error);
    throw error;
  }
}

/**
 * Perform combined semantic and text search
 */
export async function combinedSearch(
  query: string,
  userId: string,
  options: {
    semanticWeight?: number;
    textWeight?: number;
    maxResults?: number;
    documentType?: string;
    dateRange?: { start: Date; end: Date };
  } = {}
): Promise<CombinedSearchResult> {
  const {
    semanticWeight = 0.7,
    textWeight = 0.3,
    maxResults = 20,
    documentType,
    dateRange
  } = options;

  try {
    // Perform both searches in parallel
    const [semanticResults, textResults] = await Promise.all([
      semanticSearch({
        query,
        userId,
        maxResults: Math.ceil(maxResults * semanticWeight)
      }),
      textSearch({
        query,
        userId,
        documentType,
        dateRange
      })
    ]);

    // Combine and deduplicate results
    const documentIds = new Set<string>();
    const combinedResults: UploadedDocument[] = [];

    // Add semantic results first (higher priority)
    semanticResults.forEach(result => {
      if (result.document && !documentIds.has(result.document.id)) {
        documentIds.add(result.document.id);
        combinedResults.push(result.document);
      }
    });

    // Add text results that aren't already included
    textResults.forEach(document => {
      if (!documentIds.has(document.id)) {
        documentIds.add(document.id);
        combinedResults.push(document);
      }
    });

    return {
      semanticResults,
      textResults: combinedResults.slice(0, maxResults),
      totalResults: combinedResults.length
    };
  } catch (error) {
    console.error('Combined search failed:', error);
    throw error;
  }
}

/**
 * Get similar documents based on a document's content
 */
export async function findSimilarDocuments(
  documentId: string,
  userId: string,
  maxResults: number = 5
): Promise<SearchResult[]> {
  try {
    // Get the document's first embedding chunk as reference
    const { data: embeddingData, error: embeddingError } = await supabase
      .from('document_embeddings')
      .select('embedding')
      .eq('document_id', documentId)
      .eq('chunk_index', 0)
      .single();

    if (embeddingError || !embeddingData) {
      throw new Error('Document embedding not found');
    }

    // Search for similar documents
    const { data, error } = await supabase.rpc('search_similar_chunks', {
      query_embedding: embeddingData.embedding,
      similarity_threshold: 0.6,
      match_count: maxResults + 5, // Get extra to filter out the source document
      user_filter: userId
    });

    if (error) {
      throw new Error('Failed to find similar documents');
    }

    // Filter out the source document and limit results
    const filteredResults = (data || [])
      .filter((result: any) => result.document_id !== documentId)
      .slice(0, maxResults);

    // Enrich with document details
    const enrichedResults = await Promise.all(
      filteredResults.map(async (result: any) => {
        const { data: document } = await supabase
          .from('uploaded_documents')
          .select('*')
          .eq('id', result.document_id)
          .single();

        return {
          id: result.id,
          document_id: result.document_id,
          chunk_text: result.chunk_text,
          similarity: result.similarity,
          document: document || undefined
        };
      })
    );

    return enrichedResults;
  } catch (error) {
    console.error('Find similar documents failed:', error);
    throw error;
  }
}

/**
 * Search within a specific document
 */
export async function searchWithinDocument(
  documentId: string,
  query: string,
  userId: string
): Promise<SearchResult[]> {
  try {
    // Generate embedding for the query
    const { embedding } = await generateEmbedding(query);

    // Search within the specific document
    const { data, error } = await supabase.rpc('search_similar_chunks', {
      query_embedding: embedding,
      similarity_threshold: 0.5, // Lower threshold for within-document search
      match_count: 10,
      user_filter: userId
    });

    if (error) {
      throw new Error('Failed to search within document');
    }

    // Filter results to only include the specified document
    const documentResults = (data || []).filter(
      (result: any) => result.document_id === documentId
    );

    // Enrich with document details
    const enrichedResults = await Promise.all(
      documentResults.map(async (result: any) => {
        const { data: document } = await supabase
          .from('uploaded_documents')
          .select('*')
          .eq('id', result.document_id)
          .single();

        return {
          id: result.id,
          document_id: result.document_id,
          chunk_text: result.chunk_text,
          similarity: result.similarity,
          document: document || undefined
        };
      })
    );

    return enrichedResults;
  } catch (error) {
    console.error('Search within document failed:', error);
    throw error;
  }
}
