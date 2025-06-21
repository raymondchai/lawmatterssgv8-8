import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { templateAnalyticsService } from '@/lib/services/templateAnalytics';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('TemplateAnalyticsService', () => {
  const mockSupabaseFrom = vi.mocked(supabase.from);
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getDashboardAnalytics', () => {
    it('should fetch comprehensive analytics data', async () => {
      // Mock different queries for different tables
      const mockQueries = {
        templates: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 150, error: null })
        },
        template_downloads: {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ 
            count: 1250, 
            error: null,
            data: [
              { id: '1', template_id: 'template-1', format: 'pdf', created_at: '2024-01-01' },
              { id: '2', template_id: 'template-2', format: 'docx', created_at: '2024-01-02' }
            ]
          })
        },
        profiles: {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({ count: 500, error: null })
        },
        template_categories: {
          select: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'cat-1',
                name: 'Business',
                templates: [
                  { id: 'template-1', download_count: 100, price_sgd: 50 },
                  { id: 'template-2', download_count: 75, price_sgd: 30 }
                ]
              }
            ],
            error: null
          })
        }
      };

      mockSupabaseFrom.mockImplementation((table: string) => {
        return mockQueries[table as keyof typeof mockQueries] || {
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      const result = await templateAnalyticsService.getDashboardAnalytics();

      expect(result).toEqual(expect.objectContaining({
        totalTemplates: expect.any(Number),
        totalDownloads: expect.any(Number),
        totalRevenue: expect.any(Number),
        totalUsers: expect.any(Number),
        downloadsThisMonth: expect.any(Number),
        revenueThisMonth: expect.any(Number),
        newUsersThisMonth: expect.any(Number),
        popularTemplates: expect.any(Array),
        categoryStats: expect.any(Array),
        userEngagement: expect.objectContaining({
          averageSessionDuration: expect.any(Number),
          bounceRate: expect.any(Number),
          conversionRate: expect.any(Number),
          repeatUsers: expect.any(Number)
        }),
        revenueBreakdown: expect.objectContaining({
          public: expect.any(Number),
          premium: expect.any(Number),
          enterprise: expect.any(Number)
        }),
        downloadTrends: expect.any(Array),
        formatStats: expect.any(Array)
      }));
    });

    it('should handle analytics errors gracefully', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })
      } as any);

      await expect(
        templateAnalyticsService.getDashboardAnalytics()
      ).rejects.toThrow('Failed to fetch analytics data');
    });

    it('should accept custom date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ count: 100, error: null, data: [] })
      };

      mockSupabaseFrom.mockReturnValue(mockQuery as any);

      await templateAnalyticsService.getDashboardAnalytics({
        start: startDate,
        end: endDate
      });

      // Verify that date filters were applied
      expect(mockQuery.gte).toHaveBeenCalledWith('created_at', startDate.toISOString());
      expect(mockQuery.lte).toHaveBeenCalledWith('created_at', endDate.toISOString());
    });
  });

  describe('getTemplatePerformance', () => {
    it('should fetch template performance metrics', async () => {
      const mockTemplateData = [
        {
          id: 'template-1',
          title: 'Business Agreement',
          download_count: 150,
          rating_average: 4.5,
          updated_at: '2024-01-01T00:00:00Z',
          template_analytics: [
            { event_type: 'template_view' },
            { event_type: 'template_view' },
            { event_type: 'customization_started' }
          ],
          template_downloads: [
            { format: 'pdf' },
            { format: 'docx' }
          ],
          template_customizations: [
            { id: 'custom-1' },
            { id: 'custom-2' }
          ]
        }
      ];

      const mockQuery = {
        select: vi.fn().mockResolvedValue({
          data: mockTemplateData,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockQuery as any);

      const result = await templateAnalyticsService.getTemplatePerformance();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        templateId: 'template-1',
        title: 'Business Agreement',
        views: 2,
        customizations: 2,
        downloads: 150,
        revenue: expect.any(Number),
        rating: 4.5,
        conversionRate: expect.any(Number),
        lastUpdated: expect.any(Date)
      }));
    });

    it('should fetch performance for specific template', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockQuery as any);

      await templateAnalyticsService.getTemplatePerformance('template-1');

      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'template-1');
    });
  });

  describe('getRevenueAnalytics', () => {
    it('should calculate revenue analytics', async () => {
      // Mock the private methods by setting up the service to return expected values
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            { id: 'template-1', title: 'Template 1', download_count: 100, price_sgd: 50 },
            { id: 'template-2', title: 'Template 2', download_count: 75, price_sgd: 30 }
          ],
          error: null,
          count: 1000
        })
      };

      mockSupabaseFrom.mockReturnValue(mockQuery as any);

      const result = await templateAnalyticsService.getRevenueAnalytics();

      expect(result).toEqual(expect.objectContaining({
        totalRevenue: expect.any(Number),
        monthlyRevenue: expect.any(Number),
        revenueGrowth: expect.any(Number),
        averageOrderValue: expect.any(Number),
        topRevenueTemplates: expect.arrayContaining([
          expect.objectContaining({
            templateId: expect.any(String),
            title: expect.any(String),
            revenue: expect.any(Number),
            downloads: expect.any(Number)
          })
        ])
      }));
    });
  });

  describe('private helper methods', () => {
    it('should calculate total templates correctly', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 150, error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockQuery as any);

      // Access private method through bracket notation for testing
      const result = await (templateAnalyticsService as any).getTotalTemplates();

      expect(result).toBe(150);
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should handle errors in helper methods', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ 
          count: null, 
          error: { message: 'Query failed' } 
        })
      };

      mockSupabaseFrom.mockReturnValue(mockQuery as any);

      await expect(
        (templateAnalyticsService as any).getTotalTemplates()
      ).rejects.toThrow();
    });

    it('should calculate downloads in period correctly', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ count: 50, error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockQuery as any);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await (templateAnalyticsService as any).getDownloadsInPeriod(startDate, endDate);

      expect(result).toBe(50);
      expect(mockQuery.gte).toHaveBeenCalledWith('created_at', startDate.toISOString());
      expect(mockQuery.lte).toHaveBeenCalledWith('created_at', endDate.toISOString());
    });

    it('should get popular templates correctly', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          title: 'Popular Template',
          download_count: 200,
          price_sgd: 50,
          categories: { name: 'Business' }
        }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockTemplates,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockQuery as any);

      const result = await (templateAnalyticsService as any).getPopularTemplates(5);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'template-1',
        title: 'Popular Template',
        downloadCount: 200,
        revenue: 10000, // 200 * 50
        category: 'Business'
      }));
    });

    it('should get format stats correctly', async () => {
      const mockDownloads = [
        { format: 'pdf' },
        { format: 'pdf' },
        { format: 'docx' },
        { format: 'html' }
      ];

      const mockQuery = {
        select: vi.fn().mockResolvedValue({
          data: mockDownloads,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockQuery as any);

      const result = await (templateAnalyticsService as any).getFormatStats();

      expect(result).toHaveLength(3);
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({
          format: 'pdf',
          count: 2,
          percentage: 50
        }),
        expect.objectContaining({
          format: 'docx',
          count: 1,
          percentage: 25
        }),
        expect.objectContaining({
          format: 'html',
          count: 1,
          percentage: 25
        })
      ]));
    });
  });
});
