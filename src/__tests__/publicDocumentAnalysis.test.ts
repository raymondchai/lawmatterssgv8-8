import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { publicDocumentAnalysisService } from '@/lib/services/publicDocumentAnalysis';
import { publicAnalyticsService } from '@/lib/services/publicAnalytics';
import { publicStorageManager } from '@/lib/services/publicStorageManager';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null })
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ 
          data: { signedUrl: 'https://example.com/signed-url' }, 
          error: null 
        })
      }))
    }
  }
}));

// Mock fetch for IP detection
global.fetch = vi.fn();

describe('Public Document Analysis Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock IP detection
    (global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ ip: '127.0.0.1' })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('File Validation', () => {
    it('should validate file size correctly', () => {
      const smallFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(smallFile, 'size', { value: 1024 }); // 1KB
      
      const result = publicDocumentAnalysisService.validateFile(smallFile);
      expect(result.valid).toBe(true);
    });

    it('should reject files that are too large', () => {
      const largeFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(largeFile, 'size', { value: 20 * 1024 * 1024 }); // 20MB
      
      const result = publicDocumentAnalysisService.validateFile(largeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File size exceeds limit');
    });

    it('should validate file types correctly', () => {
      const validFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const invalidFile = new File(['test'], 'test.doc', { type: 'application/msword' });
      
      expect(publicDocumentAnalysisService.validateFile(validFile).valid).toBe(true);
      expect(publicDocumentAnalysisService.validateFile(invalidFile).valid).toBe(false);
    });

    it('should accept all supported file types', () => {
      const supportedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
      ];

      supportedTypes.forEach(type => {
        const file = new File(['test'], `test.${type.split('/')[1]}`, { type });
        Object.defineProperty(file, 'size', { value: 1024 });
        
        const result = publicDocumentAnalysisService.validateFile(file);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should check rate limits using Edge Function', async () => {
      const mockRateLimit = {
        allowed: true,
        remaining: { hourly: 2, daily: 8 },
        resetTime: { 
          hourly: new Date().toISOString(), 
          daily: new Date().toISOString() 
        }
      };

      const { supabase } = await import('@/lib/supabase');
      (supabase.functions.invoke as any).mockResolvedValue({
        data: mockRateLimit,
        error: null
      });

      const result = await publicDocumentAnalysisService.checkRateLimit('127.0.0.1');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining.hourly).toBe(2);
      expect(result.remaining.daily).toBe(8);
    });

    it('should handle rate limit exceeded', async () => {
      const mockRateLimit = {
        allowed: false,
        remaining: { hourly: 0, daily: 5 },
        resetTime: { 
          hourly: new Date().toISOString(), 
          daily: new Date().toISOString() 
        },
        message: 'Hourly limit exceeded'
      };

      const { supabase } = await import('@/lib/supabase');
      (supabase.functions.invoke as any).mockResolvedValue({
        data: mockRateLimit,
        error: null
      });

      const result = await publicDocumentAnalysisService.checkRateLimit('127.0.0.1');
      
      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Hourly limit exceeded');
    });

    it('should handle rate limit service errors', async () => {
      const { supabase } = await import('@/lib/supabase');
      (supabase.functions.invoke as any).mockResolvedValue({
        data: null,
        error: { message: 'Service unavailable' }
      });

      const result = await publicDocumentAnalysisService.checkRateLimit('127.0.0.1');
      
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Unable to verify rate limit');
    });
  });

  describe('Session Management', () => {
    it('should create new session when none exists', async () => {
      const mockSession = {
        id: 'session-123',
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        documents_analyzed: 0,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        total_storage_used: 0
      };

      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any)().single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
      (supabase.from as any)().single.mockResolvedValueOnce({ data: mockSession, error: null });

      const session = await publicDocumentAnalysisService.getOrCreateSession('127.0.0.1', 'test-agent');
      
      expect(session.id).toBe('session-123');
      expect(session.ipAddress).toBe('127.0.0.1');
      expect(session.documentsAnalyzed).toBe(0);
    });

    it('should return existing active session', async () => {
      const mockSession = {
        id: 'existing-session',
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        documents_analyzed: 2,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        total_storage_used: 1024
      };

      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any)().single.mockResolvedValue({ data: mockSession, error: null });

      const session = await publicDocumentAnalysisService.getOrCreateSession('127.0.0.1', 'test-agent');
      
      expect(session.id).toBe('existing-session');
      expect(session.documentsAnalyzed).toBe(2);
    });
  });

  describe('Document Analysis', () => {
    it('should analyze document successfully', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(mockFile, 'size', { value: 1024 });

      const mockAnalysis = {
        analysisId: 'analysis-123',
        success: true,
        result: {
          summary: 'Test document summary',
          keyWords: ['test', 'document'],
          documentType: 'General Document',
          textLength: 100,
          ocrQuality: 0.9
        }
      };

      const { supabase } = await import('@/lib/supabase');
      
      // Mock rate limit check
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: { allowed: true, remaining: { hourly: 2, daily: 8 } },
        error: null
      });
      
      // Mock document analysis
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: mockAnalysis,
        error: null
      });

      // Mock get analysis result
      const mockAnalysisRecord = {
        id: 'analysis-123',
        session_id: 'session-123',
        filename: 'test.pdf',
        file_size: 1024,
        file_type: 'application/pdf',
        analysis_result: mockAnalysis.result,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString()
      };
      
      (supabase.from as any)().single.mockResolvedValue({ data: mockAnalysisRecord, error: null });

      const result = await publicDocumentAnalysisService.analyzeDocument(
        mockFile,
        'session-123',
        '127.0.0.1'
      );

      expect(result.id).toBe('analysis-123');
      expect(result.filename).toBe('test.pdf');
      expect(result.analysisResult.summary).toBe('Test document summary');
    });

    it('should handle analysis failures', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(mockFile, 'size', { value: 1024 });

      const { supabase } = await import('@/lib/supabase');
      
      // Mock rate limit check
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: { allowed: true, remaining: { hourly: 2, daily: 8 } },
        error: null
      });
      
      // Mock analysis failure
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: { success: false, error: 'Analysis failed' },
        error: null
      });

      await expect(
        publicDocumentAnalysisService.analyzeDocument(mockFile, 'session-123', '127.0.0.1')
      ).rejects.toThrow('Analysis failed');
    });
  });

  describe('Analytics Service', () => {
    beforeEach(() => {
      // Mock crypto.randomUUID
      Object.defineProperty(global, 'crypto', {
        value: { randomUUID: () => 'test-session-id' }
      });
      
      // Mock navigator
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'test-agent', language: 'en-US' }
      });
      
      // Mock screen
      Object.defineProperty(global, 'screen', {
        value: { width: 1920, height: 1080 }
      });
      
      // Mock Intl
      Object.defineProperty(global, 'Intl', {
        value: { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: 'UTC' }) }) }
      });
      
      // Mock window and document
      Object.defineProperty(global, 'window', {
        value: { location: { href: 'http://localhost:3000' } }
      });
      
      Object.defineProperty(global, 'document', {
        value: { referrer: 'http://google.com' }
      });
    });

    it('should initialize session and track page view', async () => {
      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any)().insert.mockResolvedValue({ error: null });

      const sessionId = await publicAnalyticsService.initializeSession();
      
      expect(sessionId).toBe('test-session-id');
      expect(supabase.from).toHaveBeenCalledWith('public_analytics_events');
    });

    it('should track events correctly', async () => {
      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any)().insert.mockResolvedValue({ error: null });

      await publicAnalyticsService.trackEvent('test_event', { key: 'value' });
      
      expect(supabase.from).toHaveBeenCalledWith('public_analytics_events');
    });

    it('should track document upload events', async () => {
      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any)().insert.mockResolvedValue({ error: null });

      await publicAnalyticsService.trackDocumentUpload(1024, 'application/pdf', 'test.pdf');
      
      expect(supabase.from).toHaveBeenCalledWith('public_analytics_events');
    });

    it('should track analysis completion', async () => {
      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any)().insert.mockResolvedValue({ error: null });

      await publicAnalyticsService.trackAnalysisComplete('analysis-123', 5000, 'Contract', 1000);
      
      expect(supabase.from).toHaveBeenCalledWith('public_analytics_events');
    });
  });

  describe('Storage Manager', () => {
    it('should check storage quota correctly', async () => {
      const mockSession = {
        id: 'session-123',
        total_storage_used: 1024,
        expires_at: new Date(Date.now() + 3600000).toISOString()
      };

      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any)().single.mockResolvedValue({ data: mockSession, error: null });
      (supabase.from as any)().select.mockResolvedValue({ data: [{ file_size: 1024 }], error: null });

      const storageInfo = await publicStorageManager.getSessionStorageInfo('session-123');
      
      expect(storageInfo).toBeDefined();
      expect(storageInfo?.totalSize).toBe(1024);
      expect(storageInfo?.quota.used).toBe(1024);
    });

    it('should validate file upload permissions', async () => {
      const mockSession = {
        id: 'session-123',
        total_storage_used: 1024,
        expires_at: new Date(Date.now() + 3600000).toISOString()
      };

      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any)().single.mockResolvedValue({ data: mockSession, error: null });
      (supabase.from as any)().select.mockResolvedValue({ data: [{ file_size: 1024 }], error: null });

      const result = await publicStorageManager.canUploadFile('session-123', 1024);
      
      expect(result.allowed).toBe(true);
      expect(result.storageInfo).toBeDefined();
    });

    it('should reject upload when quota exceeded', async () => {
      const mockSession = {
        id: 'session-123',
        total_storage_used: 50 * 1024 * 1024, // 50MB (at limit)
        expires_at: new Date(Date.now() + 3600000).toISOString()
      };

      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any)().single.mockResolvedValue({ data: mockSession, error: null });
      (supabase.from as any)().select.mockResolvedValue({ data: [], error: null });

      const result = await publicStorageManager.canUploadFile('session-123', 1024);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Storage quota exceeded');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete analysis workflow', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(mockFile, 'size', { value: 1024 });

      const { supabase } = await import('@/lib/supabase');
      
      // Mock all required calls
      (supabase.functions.invoke as any)
        .mockResolvedValueOnce({ data: { allowed: true }, error: null }) // Rate limit
        .mockResolvedValueOnce({ data: { success: true, analysisId: 'test-123' }, error: null }); // Analysis
      
      (supabase.from as any)().single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // No existing session
        .mockResolvedValueOnce({ // New session
          data: {
            id: 'session-123',
            ip_address: '127.0.0.1',
            user_agent: 'test',
            documents_analyzed: 0,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            total_storage_used: 0
          },
          error: null
        })
        .mockResolvedValueOnce({ // Analysis result
          data: {
            id: 'test-123',
            session_id: 'session-123',
            filename: 'test.pdf',
            file_size: 1024,
            file_type: 'application/pdf',
            analysis_result: {
              summary: 'Test summary',
              keyWords: ['test'],
              documentType: 'General',
              textLength: 100,
              ocrQuality: 0.9
            },
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 86400000).toISOString()
          },
          error: null
        });

      // Test the complete workflow
      const session = await publicDocumentAnalysisService.getOrCreateSession('127.0.0.1', 'test');
      const rateLimit = await publicDocumentAnalysisService.checkRateLimit('127.0.0.1');
      
      expect(rateLimit.allowed).toBe(true);
      expect(session.id).toBe('session-123');

      const analysis = await publicDocumentAnalysisService.analyzeDocument(
        mockFile,
        session.id,
        '127.0.0.1'
      );

      expect(analysis.id).toBe('test-123');
      expect(analysis.filename).toBe('test.pdf');
    });

    it('should handle rate limit exceeded scenario', async () => {
      const { supabase } = await import('@/lib/supabase');

      // Mock rate limit exceeded
      (supabase.functions.invoke as any).mockResolvedValue({
        data: {
          allowed: false,
          message: 'Daily limit exceeded',
          remaining: { hourly: 0, daily: 0 }
        },
        error: null
      });

      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(mockFile, 'size', { value: 1024 });

      await expect(
        publicDocumentAnalysisService.analyzeDocument(mockFile, 'session-123', '127.0.0.1')
      ).rejects.toThrow('Daily limit exceeded');
    });

    it('should handle file validation errors', async () => {
      const invalidFile = new File(['test'], 'test.doc', { type: 'application/msword' });
      Object.defineProperty(invalidFile, 'size', { value: 1024 });

      await expect(
        publicDocumentAnalysisService.analyzeDocument(invalidFile, 'session-123', '127.0.0.1')
      ).rejects.toThrow('File type application/msword is not supported');
    });
  });
});
