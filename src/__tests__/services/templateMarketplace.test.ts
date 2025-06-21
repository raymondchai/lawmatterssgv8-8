import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { templateMarketplaceService } from '@/lib/services/templateMarketplace';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn()
    }
  }
}));

describe('TemplateMarketplaceService', () => {
  const mockSupabaseFrom = vi.mocked(supabase.from);
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchTemplates', () => {
    it('should search templates with filters', async () => {
      const mockTemplates = [
        {
          id: '1',
          title: 'Test Template',
          slug: 'test-template',
          description: 'A test template',
          access_level: 'public',
          price_sgd: 0,
          download_count: 10,
          rating_average: 4.5,
          rating_count: 5,
          is_active: true,
          is_featured: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockTemplates,
          error: null,
          count: 1
        })
      };

      const mockCountQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        count: 1
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockQuery as any)
        .mockReturnValueOnce(mockCountQuery as any);

      const filters = {
        query: 'test',
        categoryId: 'business',
        accessLevel: 'public' as const,
        sortBy: 'popular' as const,
        minRating: 4,
        limit: 20,
        offset: 0
      };

      const result = await templateMarketplaceService.searchTemplates(filters);

      expect(result).toEqual({
        templates: expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            title: 'Test Template',
            accessLevel: 'public'
          })
        ]),
        total: 1,
        hasMore: false,
        filters: {
          categories: [],
          priceRanges: [],
          tags: []
        }
      });

      expect(mockSupabaseFrom).toHaveBeenCalledWith('templates');
      expect(mockQuery.select).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should handle search errors gracefully', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
          count: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockQuery as any);

      await expect(
        templateMarketplaceService.searchTemplates({})
      ).rejects.toThrow('Failed to search templates: Database error');
    });
  });

  describe('getTemplateBySlug', () => {
    it('should fetch template by slug', async () => {
      const mockTemplate = {
        id: '1',
        title: 'Test Template',
        slug: 'test-template',
        content: { template: 'Hello {{name}}' },
        fields: [
          {
            id: 'name',
            name: 'name',
            label: 'Name',
            type: 'text',
            required: true
          }
        ]
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTemplate,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockQuery as any);

      const result = await templateMarketplaceService.getTemplateBySlug('test-template');

      expect(result).toEqual(expect.objectContaining({
        id: '1',
        title: 'Test Template',
        slug: 'test-template'
      }));

      expect(mockQuery.or).toHaveBeenCalledWith('id.eq.test-template,slug.eq.test-template');
    });

    it('should return null for non-existent template', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' } // Not found error
        })
      };

      mockSupabaseFrom.mockReturnValue(mockQuery as any);

      const result = await templateMarketplaceService.getTemplateBySlug('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createCustomization', () => {
    it('should create template customization', async () => {
      const mockCustomization = {
        id: 'custom-1',
        template_id: 'template-1',
        custom_fields: { name: 'John Doe' },
        user_id: 'user-1',
        session_id: 'session-1',
        status: 'draft',
        created_at: '2024-01-01T00:00:00Z'
      };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockCustomization,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockQuery as any);

      const result = await templateMarketplaceService.createCustomization(
        'template-1',
        { name: 'John Doe' },
        'user-1',
        'session-1'
      );

      expect(result).toEqual(expect.objectContaining({
        id: 'custom-1',
        templateId: 'template-1',
        customFields: { name: 'John Doe' }
      }));

      expect(mockQuery.insert).toHaveBeenCalledWith({
        template_id: 'template-1',
        custom_fields: { name: 'John Doe' },
        user_id: 'user-1',
        session_id: 'session-1',
        status: 'draft'
      });
    });
  });

  describe('recordDownload', () => {
    it('should record template download', async () => {
      const mockQuery = {
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockQuery as any);

      // Mock getClientIP method
      const originalGetClientIP = templateMarketplaceService['getClientIP'];
      templateMarketplaceService['getClientIP'] = vi.fn().mockResolvedValue('127.0.0.1');

      await templateMarketplaceService.recordDownload(
        'template-1',
        'custom-1',
        'pdf',
        'user-1',
        'session-1'
      );

      expect(mockQuery.insert).toHaveBeenCalledWith({
        template_id: 'template-1',
        customization_id: 'custom-1',
        user_id: 'user-1',
        session_id: 'session-1',
        format: 'pdf',
        ip_address: '127.0.0.1',
        user_agent: expect.any(String)
      });

      // Restore original method
      templateMarketplaceService['getClientIP'] = originalGetClientIP;
    });
  });

  describe('rateTemplate', () => {
    it('should rate a template', async () => {
      const mockQuery = {
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockQuery as any);

      await templateMarketplaceService.rateTemplate(
        'template-1',
        'user-1',
        5,
        'Great template!'
      );

      expect(mockQuery.upsert).toHaveBeenCalledWith({
        template_id: 'template-1',
        user_id: 'user-1',
        rating: 5,
        review: 'Great template!',
        updated_at: expect.any(String)
      });
    });

    it('should handle rating errors', async () => {
      const mockQuery = {
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Rating failed' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockQuery as any);

      await expect(
        templateMarketplaceService.rateTemplate('template-1', 'user-1', 5)
      ).rejects.toThrow('Failed to rate template: Rating failed');
    });
  });

  describe('trackEvent', () => {
    it('should track analytics event', async () => {
      const mockQuery = {
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockQuery as any);

      // Mock getClientIP method
      const originalGetClientIP = templateMarketplaceService['getClientIP'];
      templateMarketplaceService['getClientIP'] = vi.fn().mockResolvedValue('127.0.0.1');

      await templateMarketplaceService.trackEvent(
        'template-1',
        'template_view',
        { source: 'browser' },
        'user-1',
        'session-1'
      );

      expect(mockQuery.insert).toHaveBeenCalledWith({
        template_id: 'template-1',
        event_type: 'template_view',
        event_data: { source: 'browser' },
        user_id: 'user-1',
        session_id: 'session-1',
        ip_address: '127.0.0.1',
        user_agent: expect.any(String)
      });

      // Restore original method
      templateMarketplaceService['getClientIP'] = originalGetClientIP;
    });
  });
});
