import { describe, it, expect, beforeEach, vi } from 'vitest';
import { publicDocumentAnalysisService } from '@/lib/services/publicDocumentAnalysis';
import { publicAnalyticsService } from '@/lib/services/publicAnalytics';
import { publicStorageManager } from '@/lib/services/publicStorageManager';

// Mock all external dependencies
vi.mock('@/lib/supabase');
vi.mock('crypto', () => ({
  randomUUID: () => 'test-session-id',
}));

describe('Public Document Analysis E2E Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup global mocks
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ip: '127.0.0.1' }),
      ok: true,
    });

    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'test-agent', language: 'en-US' },
    });
  });

  it('should complete full document analysis workflow', async () => {
    const { supabase } = await import('@/lib/supabase');
    
    // Mock successful rate limit check
    (supabase.functions.invoke as any)
      .mockResolvedValueOnce({
        data: {
          allowed: true,
          remaining: { hourly: 2, daily: 8 },
          resetTime: { hourly: new Date().toISOString(), daily: new Date().toISOString() }
        },
        error: null
      })
      // Mock successful document analysis
      .mockResolvedValueOnce({
        data: {
          success: true,
          analysisId: 'analysis-123',
          result: {
            summary: 'This is a test document analysis',
            keyWords: ['test', 'document', 'analysis'],
            documentType: 'General Document',
            textLength: 500,
            ocrQuality: 0.95
          }
        },
        error: null
      });

    // Mock session creation
    (supabase.from as any)()
      .single
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // No existing session
      .mockResolvedValueOnce({ // Create new session
        data: {
          id: 'session-123',
          ip_address: '127.0.0.1',
          user_agent: 'test-agent',
          documents_analyzed: 0,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          total_storage_used: 0
        },
        error: null
      })
      .mockResolvedValueOnce({ // Get analysis result
        data: {
          id: 'analysis-123',
          session_id: 'session-123',
          filename: 'test-document.pdf',
          file_size: 1024,
          file_type: 'application/pdf',
          analysis_result: {
            summary: 'This is a test document analysis',
            keyWords: ['test', 'document', 'analysis'],
            documentType: 'General Document',
            textLength: 500,
            ocrQuality: 0.95
          },
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString()
        },
        error: null
      });

    // Mock analytics tracking
    (supabase.from as any)().insert.mockResolvedValue({ error: null });

    // Create test file
    const testFile = new File(['test content'], 'test-document.pdf', { type: 'application/pdf' });
    Object.defineProperty(testFile, 'size', { value: 1024 });

    // Step 1: Initialize analytics session
    const sessionId = await publicAnalyticsService.initializeSession();
    expect(sessionId).toBe('test-session-id');

    // Step 2: Check rate limits
    const rateLimit = await publicDocumentAnalysisService.checkRateLimit('127.0.0.1');
    expect(rateLimit.allowed).toBe(true);
    expect(rateLimit.remaining.hourly).toBe(2);

    // Step 3: Create or get session
    const session = await publicDocumentAnalysisService.getOrCreateSession('127.0.0.1', 'test-agent');
    expect(session.id).toBe('session-123');
    expect(session.documentsAnalyzed).toBe(0);

    // Step 4: Validate file
    const validation = publicDocumentAnalysisService.validateFile(testFile);
    expect(validation.valid).toBe(true);

    // Step 5: Check storage quota
    const storageCheck = await publicStorageManager.canUploadFile(session.id, testFile.size);
    expect(storageCheck.allowed).toBe(true);

    // Step 6: Track document upload
    await publicAnalyticsService.trackDocumentUpload(testFile.size, testFile.type, testFile.name);

    // Step 7: Analyze document
    const analysis = await publicDocumentAnalysisService.analyzeDocument(
      testFile,
      session.id,
      '127.0.0.1'
    );

    expect(analysis.id).toBe('analysis-123');
    expect(analysis.filename).toBe('test-document.pdf');
    expect(analysis.analysisResult.summary).toBe('This is a test document analysis');
    expect(analysis.analysisResult.keyWords).toEqual(['test', 'document', 'analysis']);
    expect(analysis.analysisResult.documentType).toBe('General Document');

    // Step 8: Track analysis completion
    await publicAnalyticsService.trackAnalysisComplete(
      analysis.id,
      5000, // 5 seconds processing time
      analysis.analysisResult.documentType,
      analysis.analysisResult.textLength
    );

    // Verify all expected calls were made
    expect(supabase.functions.invoke).toHaveBeenCalledTimes(2); // Rate limit + analysis
    expect(supabase.from).toHaveBeenCalled(); // Session and analytics
  });

  it('should handle rate limit exceeded scenario', async () => {
    const { supabase } = await import('@/lib/supabase');
    
    // Mock rate limit exceeded
    (supabase.functions.invoke as any).mockResolvedValue({
      data: {
        allowed: false,
        remaining: { hourly: 0, daily: 5 },
        resetTime: { hourly: new Date().toISOString(), daily: new Date().toISOString() },
        message: 'Hourly limit exceeded. Please try again in an hour.'
      },
      error: null
    });

    // Mock analytics tracking
    (supabase.from as any)().insert.mockResolvedValue({ error: null });

    const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(testFile, 'size', { value: 1024 });

    // Check rate limits
    const rateLimit = await publicDocumentAnalysisService.checkRateLimit('127.0.0.1');
    expect(rateLimit.allowed).toBe(false);
    expect(rateLimit.message).toBe('Hourly limit exceeded. Please try again in an hour.');

    // Track rate limit hit
    await publicAnalyticsService.trackRateLimit('hourly', 0);

    // Attempt to analyze should fail
    await expect(
      publicDocumentAnalysisService.analyzeDocument(testFile, 'session-123', '127.0.0.1')
    ).rejects.toThrow('Hourly limit exceeded. Please try again in an hour.');

    // Track error
    await publicAnalyticsService.trackError('rate_limit_exceeded', 'Hourly limit exceeded');
  });

  it('should handle file validation errors', async () => {
    const { supabase } = await import('@/lib/supabase');
    
    // Mock analytics tracking
    (supabase.from as any)().insert.mockResolvedValue({ error: null });

    // Create invalid file (too large)
    const largeFile = new File(['test'], 'large.pdf', { type: 'application/pdf' });
    Object.defineProperty(largeFile, 'size', { value: 20 * 1024 * 1024 }); // 20MB

    // Validate file
    const validation = publicDocumentAnalysisService.validateFile(largeFile);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('File size exceeds limit');

    // Track validation error
    await publicAnalyticsService.trackError('validation_failed', validation.error!);

    // Create invalid file type
    const invalidTypeFile = new File(['test'], 'test.doc', { type: 'application/msword' });
    Object.defineProperty(invalidTypeFile, 'size', { value: 1024 });

    const typeValidation = publicDocumentAnalysisService.validateFile(invalidTypeFile);
    expect(typeValidation.valid).toBe(false);
    expect(typeValidation.error).toContain('File type application/msword is not supported');
  });

  it('should handle analysis service errors', async () => {
    const { supabase } = await import('@/lib/supabase');
    
    // Mock successful rate limit check
    (supabase.functions.invoke as any)
      .mockResolvedValueOnce({
        data: { allowed: true, remaining: { hourly: 2, daily: 8 } },
        error: null
      })
      // Mock analysis service error
      .mockResolvedValueOnce({
        data: { success: false, error: 'Analysis service temporarily unavailable' },
        error: null
      });

    // Mock analytics tracking
    (supabase.from as any)().insert.mockResolvedValue({ error: null });

    const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(testFile, 'size', { value: 1024 });

    // Attempt analysis
    await expect(
      publicDocumentAnalysisService.analyzeDocument(testFile, 'session-123', '127.0.0.1')
    ).rejects.toThrow('Analysis service temporarily unavailable');

    // Track error
    await publicAnalyticsService.trackError('analysis_service_error', 'Analysis service temporarily unavailable');
  });

  it('should handle storage quota exceeded', async () => {
    const { supabase } = await import('@/lib/supabase');
    
    // Mock session at storage limit
    const mockSession = {
      id: 'session-123',
      total_storage_used: 50 * 1024 * 1024, // 50MB (at limit)
      expires_at: new Date(Date.now() + 3600000).toISOString()
    };

    (supabase.from as any)().single.mockResolvedValue({ data: mockSession, error: null });
    (supabase.from as any)().select.mockResolvedValue({ data: [], error: null });

    // Mock analytics tracking
    (supabase.from as any)().insert.mockResolvedValue({ error: null });

    const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(testFile, 'size', { value: 1024 });

    // Check storage quota
    const storageCheck = await publicStorageManager.canUploadFile('session-123', testFile.size);
    expect(storageCheck.allowed).toBe(false);
    expect(storageCheck.reason).toContain('Storage quota exceeded');

    // Track storage quota error
    await publicAnalyticsService.trackError('storage_quota_exceeded', storageCheck.reason!);
  });

  it('should track conversion events', async () => {
    const { supabase } = await import('@/lib/supabase');
    
    // Mock analytics tracking
    (supabase.from as any)().insert.mockResolvedValue({ error: null });

    // Track user registration conversion
    await publicAnalyticsService.trackConversion('registration', {
      source: 'public_analysis',
      documents_analyzed: 2,
      session_duration: 300000 // 5 minutes
    });

    // Track subscription conversion
    await publicAnalyticsService.trackConversion('subscription', {
      plan: 'pro',
      source: 'public_analysis_upgrade_prompt',
      trial_used: true
    });

    // Verify tracking calls
    expect(supabase.from).toHaveBeenCalledWith('public_analytics_events');
  });

  it('should handle session cleanup', async () => {
    const { supabase } = await import('@/lib/supabase');
    
    // Mock cleanup function response
    (supabase.functions.invoke as any).mockResolvedValue({
      data: {
        success: true,
        stats: {
          deletedAnalyses: 5,
          deletedSessions: 3,
          deletedFiles: 8,
          errors: []
        }
      },
      error: null
    });

    // Run cleanup
    const cleanupResult = await publicStorageManager.cleanupExpiredSessions();
    
    expect(cleanupResult.success).toBe(true);
    expect(cleanupResult.stats?.deletedAnalyses).toBe(5);
    expect(cleanupResult.stats?.deletedSessions).toBe(3);
    expect(cleanupResult.stats?.deletedFiles).toBe(8);
  });
});
