import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { templateMarketplaceService } from '@/lib/services/templateMarketplace';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const createChainableMock = () => {
    const chainable = {
      select: vi.fn(() => chainable),
      eq: vi.fn(() => chainable),
      gte: vi.fn(() => chainable),
      lte: vi.fn(() => chainable),
      overlaps: vi.fn(() => chainable),
      order: vi.fn(() => chainable),
      limit: vi.fn(() => chainable),
      range: vi.fn(() => chainable),
      single: vi.fn(() => ({
        data: null,
        error: null
      })),
      data: [],
      error: null
    };
    return chainable;
  };

  return {
    supabase: {
      from: vi.fn(() => {
        const chainable = createChainableMock();
        return {
          select: vi.fn(() => chainable),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => ({
                data: null,
                error: null
              }))
            }))
          })),
          upsert: vi.fn(() => ({
            data: null,
            error: null
          })),
          or: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: null,
                error: null
              }))
            }))
          }))
        };
      })
    }
  };
});

describe('Template Marketplace Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Template Discovery Flow', () => {
    it('should complete template discovery workflow', async () => {
      // Mock template categories
      const mockCategories = [
        {
          id: 'business',
          name: 'Business',
          slug: 'business',
          description: 'Business templates',
          is_active: true
        }
      ];

      // Mock templates
      const mockTemplates = [
        {
          id: 'template-1',
          title: 'Business Agreement',
          slug: 'business-agreement',
          description: 'A business agreement template',
          category_id: 'business',
          access_level: 'public',
          price_sgd: 0,
          is_active: true,
          category: mockCategories[0]
        }
      ];

      // Mock Supabase responses
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const createChainableQuery = (finalData: any, isCountQuery = false) => {
          const chainable = {
            eq: vi.fn(() => chainable),
            gte: vi.fn(() => chainable),
            lte: vi.fn(() => chainable),
            overlaps: vi.fn(() => chainable),
            order: vi.fn(() => chainable),
            limit: vi.fn(() => chainable),
            range: vi.fn(() => ({
              data: finalData,
              error: null,
              count: Array.isArray(finalData) ? finalData.length : 1
            })),
            data: finalData,
            error: null,
            count: isCountQuery ? (Array.isArray(finalData) ? finalData.length : 1) : undefined
          };
          return chainable;
        };

        if (table === 'template_categories') {
          return {
            select: vi.fn(() => createChainableQuery(mockCategories))
          } as any;
        }

        if (table === 'templates') {
          return {
            select: vi.fn((fields: string, options?: any) => {
              // Handle count query
              if (options && options.count === 'exact' && options.head === true) {
                return createChainableQuery(mockTemplates, true);
              }
              // Handle regular query
              return createChainableQuery(mockTemplates);
            })
          } as any;
        }

        return {} as any;
      });

      // Test template categories retrieval
      const categories = await templateMarketplaceService.getCategories();
      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe('Business');

      // Test template search
      const searchResult = await templateMarketplaceService.searchTemplates({
        categoryId: 'business'
      });
      
      expect(searchResult.templates).toHaveLength(1);
      expect(searchResult.templates[0].title).toBe('Business Agreement');
      expect(searchResult.total).toBe(1);
    });

    it('should handle template customization workflow', async () => {
      const mockCustomization = {
        id: 'custom-1',
        template_id: 'template-1',
        user_id: 'user-1',
        custom_fields: { name: 'Test Company' },
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock customization creation
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'template_customizations') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: mockCustomization,
                  error: null
                }))
              }))
            }))
          } as any;
        }
        return {} as any;
      });

      const customization = await templateMarketplaceService.createCustomization(
        'template-1',
        { name: 'Test Company' },
        'user-1'
      );

      expect(customization.id).toBe('custom-1');
      expect(customization.customFields).toEqual({ name: 'Test Company' });
      expect(customization.status).toBe('draft');
    });

    it('should handle template rating workflow', async () => {
      const mockRating = {
        id: 'rating-1',
        template_id: 'template-1',
        user_id: 'user-1',
        rating: 5,
        review: 'Great template!',
        created_at: new Date().toISOString()
      };

      // Mock rating creation
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'template_ratings') {
          return {
            upsert: vi.fn(() => ({
              data: null,
              error: null
            }))
          } as any;
        }
        return {} as any;
      });

      await templateMarketplaceService.rateTemplate(
        'template-1',
        'user-1',
        5,
        'Great template!'
      );

      // Verify the upsert was called with correct data
      expect(supabase.from).toHaveBeenCalledWith('template_ratings');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              data: null,
              error: { message: 'Database connection failed' }
            }))
          }))
        }))
      }) as any);

      await expect(templateMarketplaceService.getCategories()).rejects.toThrow(
        'Failed to fetch categories: Database connection failed'
      );
    });

    it('should handle missing template gracefully', async () => {
      // Mock empty result
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn(() => ({
          or: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: null,
                error: { code: 'PGRST116' }
              }))
            }))
          }))
        }))
      }) as any);

      const template = await templateMarketplaceService.getTemplate('non-existent');
      expect(template).toBeNull();
    });
  });

  describe('Analytics Integration', () => {
    it('should track template events', async () => {
      const trackEventSpy = vi.spyOn(templateMarketplaceService, 'trackEvent');
      
      await templateMarketplaceService.trackEvent('template-1', 'template_view', {
        source: 'browser',
        category: 'business'
      });

      expect(trackEventSpy).toHaveBeenCalledWith('template-1', 'template_view', {
        source: 'browser',
        category: 'business'
      });
    });
  });
});
