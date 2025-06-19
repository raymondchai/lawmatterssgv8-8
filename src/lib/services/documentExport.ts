import { supabase } from '@/lib/supabase';
import { usageTrackingService } from '@/lib/services/usageTracking';
import { documentAnalysisService } from '@/lib/services/documentAnalysis';
import { aiApi } from '@/lib/api/ai';
import type { UploadedDocument } from '@/types';

export interface ExportOptions {
  format: 'pdf' | 'docx' | 'txt' | 'json';
  includeAnalysis?: boolean;
  includeMetadata?: boolean;
  customTemplate?: string;
  watermark?: string;
}

export interface CustomDocumentRequest {
  templateType: 'contract' | 'agreement' | 'letter' | 'memo' | 'report' | 'custom';
  title: string;
  content: string;
  variables?: Record<string, string>;
  formatting?: {
    fontSize?: number;
    fontFamily?: string;
    margins?: { top: number; bottom: number; left: number; right: number };
    header?: string;
    footer?: string;
  };
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  contentType: string;
  size: number;
}

class DocumentExportService {
  /**
   * Download original document with usage tracking
   */
  async downloadDocument(
    documentId: string,
    options: ExportOptions = { format: 'pdf' }
  ): Promise<ExportResult> {
    // Check usage limits for document downloads
    const usageCheck = await usageTrackingService.checkAndIncrementUsage('document_download', documentId, {
      operation: 'download',
      format: options.format,
      include_analysis: options.includeAnalysis
    });

    if (!usageCheck.allowed) {
      throw new Error(`Download limit exceeded. You have used ${usageCheck.limit?.current}/${usageCheck.limit?.limit} document downloads this month.`);
    }

    // Get document
    const { data: document, error } = await supabase
      .from('uploaded_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !document) {
      throw new Error('Document not found');
    }

    // Get file from storage
    const fileName = this.extractFileNameFromUrl(document.file_url);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(fileName);

    if (downloadError) {
      throw new Error(`Failed to download document: ${downloadError.message}`);
    }

    let resultBlob = fileData;
    let contentType = this.getContentType(options.format);
    let filename = this.generateFilename(document.filename, options.format);

    // If analysis is requested, create enhanced document
    if (options.includeAnalysis) {
      const analysis = await documentAnalysisService.getAnalysisResults(documentId);
      if (analysis) {
        resultBlob = await this.createEnhancedDocument(document, analysis, options);
        filename = this.generateFilename(document.filename, options.format, 'enhanced');
      }
    }

    return {
      blob: resultBlob,
      filename,
      contentType,
      size: resultBlob.size
    };
  }

  /**
   * Generate custom document
   */
  async generateCustomDocument(
    request: CustomDocumentRequest,
    options: ExportOptions = { format: 'pdf' }
  ): Promise<ExportResult> {
    // Check usage limits for custom document generation
    const usageCheck = await usageTrackingService.checkAndIncrementUsage('custom_document', undefined, {
      operation: 'generate',
      template_type: request.templateType,
      format: options.format
    });

    if (!usageCheck.allowed) {
      throw new Error(`Custom document limit exceeded. You have used ${usageCheck.limit?.current}/${usageCheck.limit?.limit} custom documents this month.`);
    }

    // Generate document content using AI if needed
    let finalContent = request.content;
    
    if (request.templateType !== 'custom') {
      finalContent = await this.generateTemplateContent(request);
    }

    // Apply variable substitution
    if (request.variables) {
      finalContent = this.applyVariables(finalContent, request.variables);
    }

    // Create document blob based on format
    const blob = await this.createDocumentBlob(finalContent, request, options);
    const filename = this.generateCustomFilename(request.title, options.format);

    return {
      blob,
      filename,
      contentType: this.getContentType(options.format),
      size: blob.size
    };
  }

  /**
   * Export document analysis as standalone document
   */
  async exportAnalysis(
    documentId: string,
    options: ExportOptions = { format: 'pdf' }
  ): Promise<ExportResult> {
    const analysis = await documentAnalysisService.getAnalysisResults(documentId);
    if (!analysis) {
      throw new Error('No analysis found for this document');
    }

    const { data: document } = await supabase
      .from('uploaded_documents')
      .select('filename')
      .eq('id', documentId)
      .single();

    const content = this.formatAnalysisForExport(analysis);
    const blob = await this.createAnalysisBlob(content, options);
    const filename = this.generateFilename(
      document?.filename || 'document',
      options.format,
      'analysis'
    );

    return {
      blob,
      filename,
      contentType: this.getContentType(options.format),
      size: blob.size
    };
  }

  /**
   * Bulk export multiple documents
   */
  async bulkExport(
    documentIds: string[],
    options: ExportOptions = { format: 'pdf' }
  ): Promise<ExportResult> {
    // Check usage limits
    for (const documentId of documentIds) {
      const usageCheck = await usageTrackingService.checkUsageLimit('document_download');
      if (!usageCheck.allowed) {
        throw new Error(`Download limit would be exceeded. You have ${usageCheck.remaining} downloads remaining.`);
      }
    }

    // Create ZIP archive
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    for (const documentId of documentIds) {
      try {
        const result = await this.downloadDocument(documentId, options);
        zip.file(result.filename, result.blob);
      } catch (error) {
        console.error(`Failed to export document ${documentId}:`, error);
        // Continue with other documents
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    return {
      blob: zipBlob,
      filename: `documents-export-${new Date().toISOString().split('T')[0]}.zip`,
      contentType: 'application/zip',
      size: zipBlob.size
    };
  }

  // Private helper methods

  private async generateTemplateContent(request: CustomDocumentRequest): Promise<string> {
    const prompt = `
      Generate a professional ${request.templateType} document with the following specifications:
      
      Title: ${request.title}
      Content Requirements: ${request.content}
      
      Please create a well-structured, legally appropriate document that includes:
      1. Proper formatting and sections
      2. Professional language
      3. Placeholder variables where appropriate (use {{variable_name}} format)
      4. Standard clauses for this type of document
      
      Return only the document content without any explanations.
    `;

    const response = await aiApi.sendChatMessage({
      message: prompt,
      useRAG: false
    });

    return response.response;
  }

  private applyVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    });

    return result;
  }

  private async createDocumentBlob(
    content: string,
    request: CustomDocumentRequest,
    options: ExportOptions
  ): Promise<Blob> {
    switch (options.format) {
      case 'txt':
        return new Blob([content], { type: 'text/plain' });
      
      case 'json':
        const jsonData = {
          title: request.title,
          content,
          templateType: request.templateType,
          variables: request.variables,
          formatting: request.formatting,
          generatedAt: new Date().toISOString()
        };
        return new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      
      case 'pdf':
      case 'docx':
        // For PDF/DOCX, we would need additional libraries like jsPDF or docx
        // For now, return as HTML that can be converted to PDF client-side
        const html = this.contentToHtml(content, request);
        return new Blob([html], { type: 'text/html' });
      
      default:
        return new Blob([content], { type: 'text/plain' });
    }
  }

  private async createEnhancedDocument(
    document: UploadedDocument,
    analysis: any,
    options: ExportOptions
  ): Promise<Blob> {
    const enhancedContent = `
      Document: ${document.filename}
      
      ORIGINAL CONTENT:
      ${document.ocr_text || 'Text not available'}
      
      ANALYSIS SUMMARY:
      ${analysis.summary?.summary || 'No summary available'}
      
      KEY POINTS:
      ${analysis.summary?.keyPoints?.map((point: string) => `• ${point}`).join('\n') || 'No key points identified'}
      
      LEGAL INSIGHTS:
      Category: ${analysis.insights?.documentCategory || 'Unknown'}
      Risk Level: ${analysis.insights?.riskAssessment?.level || 'Unknown'}
      
      RECOMMENDATIONS:
      ${analysis.insights?.recommendations?.map((rec: string) => `• ${rec}`).join('\n') || 'No recommendations available'}
    `;

    return new Blob([enhancedContent], { type: 'text/plain' });
  }

  private async createAnalysisBlob(content: string, options: ExportOptions): Promise<Blob> {
    switch (options.format) {
      case 'json':
        return new Blob([content], { type: 'application/json' });
      case 'txt':
        return new Blob([content], { type: 'text/plain' });
      default:
        const html = `
          <html>
            <head><title>Document Analysis Report</title></head>
            <body>
              <h1>Document Analysis Report</h1>
              <pre>${content}</pre>
            </body>
          </html>
        `;
        return new Blob([html], { type: 'text/html' });
    }
  }

  private formatAnalysisForExport(analysis: any): string {
    return JSON.stringify(analysis, null, 2);
  }

  private contentToHtml(content: string, request: CustomDocumentRequest): string {
    const { formatting = {} } = request;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${request.title}</title>
          <style>
            body {
              font-family: ${formatting.fontFamily || 'Arial, sans-serif'};
              font-size: ${formatting.fontSize || 12}pt;
              margin: ${formatting.margins?.top || 1}in ${formatting.margins?.right || 1}in ${formatting.margins?.bottom || 1}in ${formatting.margins?.left || 1}in;
              line-height: 1.5;
            }
            h1 { font-size: 18pt; margin-bottom: 20px; }
            p { margin-bottom: 12px; }
          </style>
        </head>
        <body>
          ${formatting.header ? `<header>${formatting.header}</header>` : ''}
          <h1>${request.title}</h1>
          <div>${content.replace(/\n/g, '<br>')}</div>
          ${formatting.footer ? `<footer>${formatting.footer}</footer>` : ''}
        </body>
      </html>
    `;
  }

  private extractFileNameFromUrl(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1];
  }

  private getContentType(format: string): string {
    const types = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      json: 'application/json',
      html: 'text/html'
    };
    return types[format as keyof typeof types] || 'application/octet-stream';
  }

  private generateFilename(originalName: string, format: string, suffix?: string): string {
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    const suffixPart = suffix ? `-${suffix}` : '';
    return `${baseName}${suffixPart}.${format}`;
  }

  private generateCustomFilename(title: string, format: string): string {
    const sanitized = title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
    return `${sanitized}.${format}`;
  }
}

// Export singleton instance
export const documentExportService = new DocumentExportService();

// Export types
export type { ExportOptions, CustomDocumentRequest, ExportResult };
