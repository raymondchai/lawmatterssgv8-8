import { supabase } from '@/lib/supabase';
import { usageTrackingService } from '@/lib/services/usageTracking';
import { aiApi } from '@/lib/api/ai';
import type { UploadedDocument } from '@/types';

export interface DocumentSummary {
  summary: string;
  keyPoints: string[];
  documentType: string;
  confidence: number;
  wordCount: number;
  readingTime: number; // in minutes
}

export interface EntityExtraction {
  entities: {
    type: 'person' | 'organization' | 'location' | 'date' | 'money' | 'legal_term' | 'case_reference';
    text: string;
    confidence: number;
    startIndex: number;
    endIndex: number;
  }[];
  relationships: {
    entity1: string;
    entity2: string;
    relationship: string;
    confidence: number;
  }[];
}

export interface LegalInsights {
  documentCategory: string;
  legalConcepts: string[];
  potentialIssues: string[];
  recommendations: string[];
  complianceChecks: {
    requirement: string;
    status: 'compliant' | 'non_compliant' | 'unclear';
    details: string;
  }[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    mitigation: string[];
  };
}

export interface DocumentAnalysisResult {
  documentId: string;
  summary: DocumentSummary;
  entities: EntityExtraction;
  insights: LegalInsights;
  analysisDate: string;
  processingTime: number;
}

class DocumentAnalysisService {
  /**
   * Perform comprehensive document analysis
   */
  async analyzeDocument(
    documentId: string,
    options: {
      includeSummary?: boolean;
      includeEntities?: boolean;
      includeInsights?: boolean;
      customPrompt?: string;
    } = {}
  ): Promise<DocumentAnalysisResult> {
    const startTime = Date.now();

    // Check usage limits
    const usageCheck = await usageTrackingService.checkUsageLimit('ai_query');
    if (!usageCheck.allowed) {
      throw new Error(`AI analysis limit exceeded. You have used ${usageCheck.current}/${usageCheck.limit} AI queries this month.`);
    }

    // Get document
    const { data: document, error: docError } = await supabase
      .from('uploaded_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    if (!document.ocr_text) {
      throw new Error('Document text not available. Please ensure the document has been processed.');
    }

    const {
      includeSummary = true,
      includeEntities = true,
      includeInsights = true,
      customPrompt
    } = options;

    // Perform analysis
    const [summary, entities, insights] = await Promise.all([
      includeSummary ? this.generateSummary(document) : Promise.resolve(null),
      includeEntities ? this.extractEntities(document) : Promise.resolve(null),
      includeInsights ? this.generateLegalInsights(document, customPrompt) : Promise.resolve(null)
    ]);

    // Track usage
    await usageTrackingService.incrementUsage('ai_query', documentId, {
      operation: 'document_analysis',
      analysis_types: [
        includeSummary && 'summary',
        includeEntities && 'entities',
        includeInsights && 'insights'
      ].filter(Boolean),
      text_length: document.ocr_text.length
    });

    const processingTime = Date.now() - startTime;

    const result: DocumentAnalysisResult = {
      documentId,
      summary: summary || this.getDefaultSummary(),
      entities: entities || this.getDefaultEntities(),
      insights: insights || this.getDefaultInsights(),
      analysisDate: new Date().toISOString(),
      processingTime
    };

    // Save analysis results
    await this.saveAnalysisResults(documentId, result);

    return result;
  }

  /**
   * Generate document summary
   */
  private async generateSummary(document: UploadedDocument): Promise<DocumentSummary> {
    const prompt = `
      Analyze the following legal document and provide a comprehensive summary:

      Document Type: ${document.document_type}
      Text: ${document.ocr_text}

      Please provide:
      1. A concise summary (2-3 paragraphs)
      2. Key points (bullet points)
      3. Document type classification
      4. Confidence level (0-1)
      5. Word count
      6. Estimated reading time in minutes

      Format your response as JSON with the following structure:
      {
        "summary": "...",
        "keyPoints": ["...", "..."],
        "documentType": "...",
        "confidence": 0.95,
        "wordCount": 1234,
        "readingTime": 5
      }
    `;

    const response = await aiApi.sendChatMessage({
      message: prompt,
      useRAG: false
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      // Fallback if JSON parsing fails
      return this.parseTextSummary(response.response, document);
    }
  }

  /**
   * Extract entities from document
   */
  private async extractEntities(document: UploadedDocument): Promise<EntityExtraction> {
    const prompt = `
      Extract entities and relationships from the following legal document:

      Text: ${document.ocr_text}

      Please identify:
      1. Entities (persons, organizations, locations, dates, monetary amounts, legal terms, case references)
      2. Relationships between entities

      Format your response as JSON with the following structure:
      {
        "entities": [
          {
            "type": "person|organization|location|date|money|legal_term|case_reference",
            "text": "...",
            "confidence": 0.95,
            "startIndex": 0,
            "endIndex": 10
          }
        ],
        "relationships": [
          {
            "entity1": "...",
            "entity2": "...",
            "relationship": "...",
            "confidence": 0.9
          }
        ]
      }
    `;

    const response = await aiApi.sendChatMessage({
      message: prompt,
      useRAG: false
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      return this.getDefaultEntities();
    }
  }

  /**
   * Generate legal insights
   */
  private async generateLegalInsights(
    document: UploadedDocument,
    customPrompt?: string
  ): Promise<LegalInsights> {
    const basePrompt = `
      Analyze the following legal document and provide legal insights:

      Document Type: ${document.document_type}
      Text: ${document.ocr_text}

      Please provide:
      1. Document category classification
      2. Key legal concepts identified
      3. Potential legal issues or concerns
      4. Recommendations for action
      5. Compliance checks (if applicable)
      6. Risk assessment

      ${customPrompt ? `Additional instructions: ${customPrompt}` : ''}

      Format your response as JSON with the following structure:
      {
        "documentCategory": "...",
        "legalConcepts": ["...", "..."],
        "potentialIssues": ["...", "..."],
        "recommendations": ["...", "..."],
        "complianceChecks": [
          {
            "requirement": "...",
            "status": "compliant|non_compliant|unclear",
            "details": "..."
          }
        ],
        "riskAssessment": {
          "level": "low|medium|high",
          "factors": ["...", "..."],
          "mitigation": ["...", "..."]
        }
      }
    `;

    const response = await aiApi.sendChatMessage({
      message: basePrompt,
      useRAG: false
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      return this.getDefaultInsights();
    }
  }

  /**
   * Save analysis results to database
   */
  private async saveAnalysisResults(
    documentId: string,
    analysis: DocumentAnalysisResult
  ): Promise<void> {
    const { error } = await supabase
      .from('document_analysis')
      .upsert({
        document_id: documentId,
        analysis_data: analysis,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to save analysis results:', error);
    }
  }

  /**
   * Get saved analysis results
   */
  async getAnalysisResults(documentId: string): Promise<DocumentAnalysisResult | null> {
    const { data, error } = await supabase
      .from('document_analysis')
      .select('analysis_data')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data.analysis_data as DocumentAnalysisResult;
  }

  /**
   * Compare documents
   */
  async compareDocuments(
    documentId1: string,
    documentId2: string
  ): Promise<{
    similarities: string[];
    differences: string[];
    recommendations: string[];
  }> {
    // Check usage limits
    const usageCheck = await usageTrackingService.checkUsageLimit('ai_query');
    if (!usageCheck.allowed) {
      throw new Error(`AI analysis limit exceeded.`);
    }

    // Get both documents
    const { data: documents, error } = await supabase
      .from('uploaded_documents')
      .select('*')
      .in('id', [documentId1, documentId2]);

    if (error || !documents || documents.length !== 2) {
      throw new Error('Documents not found');
    }

    const [doc1, doc2] = documents;

    const prompt = `
      Compare the following two legal documents and provide analysis:

      Document 1:
      Type: ${doc1.document_type}
      Text: ${doc1.ocr_text}

      Document 2:
      Type: ${doc2.document_type}
      Text: ${doc2.ocr_text}

      Please provide:
      1. Key similarities between the documents
      2. Important differences
      3. Recommendations based on the comparison

      Format as JSON:
      {
        "similarities": ["...", "..."],
        "differences": ["...", "..."],
        "recommendations": ["...", "..."]
      }
    `;

    const response = await aiApi.sendChatMessage({
      message: prompt,
      useRAG: false
    });

    // Track usage
    await usageTrackingService.incrementUsage('ai_query', undefined, {
      operation: 'document_comparison',
      document_ids: [documentId1, documentId2]
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      return {
        similarities: ['Unable to parse comparison results'],
        differences: ['Analysis failed'],
        recommendations: ['Please try again']
      };
    }
  }

  // Default/fallback methods
  private parseTextSummary(text: string, document: UploadedDocument): DocumentSummary {
    const wordCount = document.ocr_text?.split(/\s+/).length || 0;
    return {
      summary: text.substring(0, 500) + '...',
      keyPoints: ['Analysis completed', 'Summary generated'],
      documentType: document.document_type,
      confidence: 0.7,
      wordCount,
      readingTime: Math.ceil(wordCount / 200) // Assuming 200 words per minute
    };
  }

  private getDefaultSummary(): DocumentSummary {
    return {
      summary: 'Summary not available',
      keyPoints: [],
      documentType: 'unknown',
      confidence: 0,
      wordCount: 0,
      readingTime: 0
    };
  }

  private getDefaultEntities(): EntityExtraction {
    return {
      entities: [],
      relationships: []
    };
  }

  private getDefaultInsights(): LegalInsights {
    return {
      documentCategory: 'unknown',
      legalConcepts: [],
      potentialIssues: [],
      recommendations: [],
      complianceChecks: [],
      riskAssessment: {
        level: 'low',
        factors: [],
        mitigation: []
      }
    };
  }
}

// Export singleton instance
export const documentAnalysisService = new DocumentAnalysisService();

// Export types
export type { DocumentSummary, EntityExtraction, LegalInsights, DocumentAnalysisResult };
