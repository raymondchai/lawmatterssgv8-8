import { supabase } from '@/lib/supabase';
import { PUBLIC_ANALYSIS_CONFIG } from '@/lib/config/constants';

export interface PublicAnalysisSession {
  id: string;
  ipAddress: string;
  userAgent: string;
  documentsAnalyzed: number;
  createdAt: Date;
  expiresAt: Date;
  totalStorageUsed: number;
}

export interface PublicDocumentAnalysis {
  id: string;
  sessionId: string;
  filename: string;
  fileSize: number;
  fileType: string;
  analysisResult: {
    summary: string;
    keyWords: string[];
    textLength: number;
    ocrQuality: number;
    documentType: string;
  };
  createdAt: Date;
  expiresAt: Date;
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: {
    hourly: number;
    daily: number;
  };
  resetTime: {
    hourly: Date;
    daily: Date;
  };
  message?: string;
}

class PublicDocumentAnalysisService {
  private readonly config = PUBLIC_ANALYSIS_CONFIG;

  /**
   * Check rate limits for public document analysis using Edge Function
   */
  async checkRateLimit(ipAddress: string): Promise<RateLimitStatus> {
    try {
      const { data, error } = await supabase.functions.invoke('public-rate-limiter', {
        body: {
          ipAddress,
          action: 'check'
        }
      });

      if (error) {
        console.error('Rate limiter error:', error);
        return {
          allowed: false,
          remaining: { hourly: 0, daily: 0 },
          resetTime: {
            hourly: new Date(),
            daily: new Date()
          },
          message: 'Unable to verify rate limit. Please try again.'
        };
      }

      return {
        allowed: data.allowed,
        remaining: data.remaining,
        resetTime: {
          hourly: new Date(data.resetTime.hourly),
          daily: new Date(data.resetTime.daily)
        },
        message: data.message
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return {
        allowed: false,
        remaining: { hourly: 0, daily: 0 },
        resetTime: {
          hourly: new Date(),
          daily: new Date()
        },
        message: 'Rate limit check failed. Please try again.'
      };
    }
  }

  /**
   * Create or get existing session for public user
   */
  async getOrCreateSession(ipAddress: string, userAgent: string): Promise<PublicAnalysisSession> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.rateLimits.sessionDuration);

    // Try to find existing active session
    const { data: existingSession } = await supabase
      .from('public_analysis_sessions')
      .select('*')
      .eq('ip_address', ipAddress)
      .gt('expires_at', now.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingSession) {
      return {
        id: existingSession.id,
        ipAddress: existingSession.ip_address,
        userAgent: existingSession.user_agent,
        documentsAnalyzed: existingSession.documents_analyzed,
        createdAt: new Date(existingSession.created_at),
        expiresAt: new Date(existingSession.expires_at),
        totalStorageUsed: existingSession.total_storage_used
      };
    }

    // Create new session
    const { data: newSession, error } = await supabase
      .from('public_analysis_sessions')
      .insert({
        ip_address: ipAddress,
        user_agent: userAgent,
        documents_analyzed: 0,
        expires_at: expiresAt.toISOString(),
        total_storage_used: 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return {
      id: newSession.id,
      ipAddress: newSession.ip_address,
      userAgent: newSession.user_agent,
      documentsAnalyzed: newSession.documents_analyzed,
      createdAt: new Date(newSession.created_at),
      expiresAt: new Date(newSession.expires_at),
      totalStorageUsed: newSession.total_storage_used
    };
  }

  /**
   * Validate file for public analysis
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.config.rateLimits.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds limit of ${this.config.rateLimits.maxFileSize / (1024 * 1024)}MB`
      };
    }

    // Check file type
    if (!this.config.rateLimits.allowedFileTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not supported. Allowed types: PDF, JPEG, PNG, WebP`
      };
    }

    return { valid: true };
  }

  /**
   * Perform basic document analysis for public users using Edge Function
   */
  async analyzeDocument(
    file: File,
    sessionId: string,
    ipAddress: string
  ): Promise<PublicDocumentAnalysis> {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check rate limits
    const rateLimit = await this.checkRateLimit(ipAddress);
    if (!rateLimit.allowed) {
      throw new Error(rateLimit.message || 'Rate limit exceeded');
    }

    try {
      // Convert file to base64 for Edge Function
      const fileContent = await this.fileToBase64(file);

      // Call the Edge Function for analysis
      const { data, error } = await supabase.functions.invoke('public-document-analysis', {
        body: {
          sessionId,
          ipAddress,
          filename: file.name,
          fileSize: file.size,
          fileType: file.type,
          fileContent
        }
      });

      if (error) {
        throw new Error(`Analysis service error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error ?? 'Analysis failed');
      }

      // Get the stored analysis record
      const analysisRecord = await this.getAnalysisResult(data.analysisId);
      if (!analysisRecord) {
        throw new Error('Failed to retrieve analysis result');
      }

      return analysisRecord;

    } catch (error) {
      console.error('Error analyzing document:', error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert file to base64 string
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }



  /**
   * Get analysis result by ID
   */
  async getAnalysisResult(analysisId: string): Promise<PublicDocumentAnalysis | null> {
    const { data, error } = await supabase
      .from('public_document_analyses')
      .select('*')
      .eq('id', analysisId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      sessionId: data.session_id,
      filename: data.filename,
      fileSize: data.file_size,
      fileType: data.file_type,
      analysisResult: data.analysis_result,
      createdAt: new Date(data.created_at),
      expiresAt: new Date(data.expires_at)
    };
  }

  /**
   * Clean up expired sessions and analyses
   */
  async cleanupExpiredData(): Promise<void> {
    const now = new Date().toISOString();

    // Delete expired analyses
    await supabase
      .from('public_document_analyses')
      .delete()
      .lt('expires_at', now);

    // Delete expired sessions
    await supabase
      .from('public_analysis_sessions')
      .delete()
      .lt('expires_at', now);
  }
}

export const publicDocumentAnalysisService = new PublicDocumentAnalysisService();
