import { supabase } from '@/lib/supabase';
import { TEMPLATE_MARKETPLACE_CONFIG } from '@/lib/config/constants';

export interface TemplateCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: string;
  sortOrder: number;
  isActive: boolean;
  subcategories?: TemplateCategory[];
}

export interface Template {
  id: string;
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  subcategory?: string;
  content: Record<string, any>;
  fields: TemplateField[];
  previewHtml?: string;
  previewPdfUrl?: string;
  accessLevel: 'public' | 'premium' | 'enterprise';
  priceSgd: number;
  jurisdiction: string;
  legalAreas: string[];
  complianceTags: string[];
  downloadCount: number;
  ratingAverage: number;
  ratingCount: number;
  createdBy?: string;
  isActive: boolean;
  isFeatured: boolean;
  tags: string[];
  language: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  category?: TemplateCategory;
}

export interface TemplateField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date' | 'number' | 'email' | 'phone';
  required: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: Array<{ label: string; value: string }>;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  helpText?: string;
  section?: string;
}

export interface TemplateCustomization {
  id: string;
  templateId: string;
  userId?: string;
  sessionId?: string;
  customFields: Record<string, any>;
  generatedContent?: string;
  generatedHtml?: string;
  generatedPdfUrl?: string;
  status: 'draft' | 'generating' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateSearchFilters {
  query?: string;
  categoryId?: string;
  subcategory?: string;
  accessLevel?: 'public' | 'premium' | 'enterprise';
  priceRange?: { min: number; max: number };
  tags?: string[];
  legalAreas?: string[];
  minRating?: number;
  sortBy?: 'relevance' | 'popularity' | 'rating' | 'newest' | 'price_low' | 'price_high';
  limit?: number;
  offset?: number;
}

export interface TemplateSearchResult {
  templates: Template[];
  total: number;
  hasMore: boolean;
  filters: {
    categories: Array<{ id: string; name: string; count: number }>;
    priceRanges: Array<{ label: string; min: number; max: number; count: number }>;
    tags: Array<{ name: string; count: number }>;
  };
}

class TemplateMarketplaceService {
  private readonly config = TEMPLATE_MARKETPLACE_CONFIG;

  /**
   * Get all template categories
   */
  async getCategories(): Promise<TemplateCategory[]> {
    const { data, error } = await supabase
      .from('template_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    return this.transformCategories(data || []);
  }

  /**
   * Get templates with filtering and pagination
   */
  async searchTemplates(filters: TemplateSearchFilters = {}): Promise<TemplateSearchResult> {
    let query = supabase
      .from('templates')
      .select(`
        *,
        category:template_categories(id, name, slug, description, icon)
      `)
      .eq('is_active', true);

    // Apply filters
    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters.subcategory) {
      query = query.eq('subcategory', filters.subcategory);
    }

    if (filters.accessLevel) {
      query = query.eq('access_level', filters.accessLevel);
    }

    if (filters.priceRange) {
      query = query
        .gte('price_sgd', filters.priceRange.min)
        .lte('price_sgd', filters.priceRange.max);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    if (filters.legalAreas && filters.legalAreas.length > 0) {
      query = query.overlaps('legal_areas', filters.legalAreas);
    }

    if (filters.minRating) {
      query = query.gte('rating_average', filters.minRating);
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'popularity':
        query = query.order('download_count', { ascending: false });
        break;
      case 'rating':
        query = query.order('rating_average', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'price_low':
        query = query.order('price_sgd', { ascending: true });
        break;
      case 'price_high':
        query = query.order('price_sgd', { ascending: false });
        break;
      default:
        query = query.order('is_featured', { ascending: false })
                   .order('download_count', { ascending: false });
    }

    // Apply pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to search templates: ${error.message}`);
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('templates')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const templates = this.transformTemplates(data || []);
    const total = totalCount || 0;
    const hasMore = offset + limit < total;

    // Get filter aggregations (simplified for now)
    const filterData = await this.getFilterAggregations(filters);

    return {
      templates,
      total,
      hasMore,
      filters: filterData
    };
  }

  /**
   * Get a single template by ID or slug
   */
  async getTemplate(idOrSlug: string): Promise<Template | null> {
    const { data, error } = await supabase
      .from('templates')
      .select(`
        *,
        category:template_categories(id, name, slug, description, icon)
      `)
      .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch template: ${error.message}`);
    }

    return this.transformTemplate(data);
  }

  /**
   * Get featured templates
   */
  async getFeaturedTemplates(limit: number = 6): Promise<Template[]> {
    const { data, error } = await supabase
      .from('templates')
      .select(`
        *,
        category:template_categories(id, name, slug, description, icon)
      `)
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('download_count', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch featured templates: ${error.message}`);
    }

    return this.transformTemplates(data || []);
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(
    categoryId?: string,
    accessLevel?: string,
    limit: number = 10
  ): Promise<Template[]> {
    const { data, error } = await supabase
      .rpc('get_popular_templates', {
        limit_count: limit,
        category_filter: categoryId || null,
        access_level_filter: accessLevel || null
      });

    if (error) {
      throw new Error(`Failed to fetch popular templates: ${error.message}`);
    }

    return this.transformPopularTemplates(data || []);
  }

  /**
   * Create a new template customization
   */
  async createCustomization(
    templateId: string,
    customFields: Record<string, any>,
    userId?: string,
    sessionId?: string
  ): Promise<TemplateCustomization> {
    const { data, error } = await supabase
      .from('template_customizations')
      .insert({
        template_id: templateId,
        user_id: userId,
        session_id: sessionId,
        custom_fields: customFields,
        status: 'draft'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create customization: ${error.message}`);
    }

    return this.transformCustomization(data);
  }

  /**
   * Update template customization
   */
  async updateCustomization(
    customizationId: string,
    updates: Partial<TemplateCustomization>
  ): Promise<TemplateCustomization> {
    const { data, error } = await supabase
      .from('template_customizations')
      .update({
        custom_fields: updates.customFields,
        generated_content: updates.generatedContent,
        generated_html: updates.generatedHtml,
        generated_pdf_url: updates.generatedPdfUrl,
        status: updates.status,
        error_message: updates.errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', customizationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update customization: ${error.message}`);
    }

    return this.transformCustomization(data);
  }

  /**
   * Get user's customizations
   */
  async getUserCustomizations(userId: string): Promise<TemplateCustomization[]> {
    const { data, error } = await supabase
      .from('template_customizations')
      .select(`
        *,
        template:templates(id, title, slug)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch customizations: ${error.message}`);
    }

    return this.transformCustomizations(data || []);
  }

  /**
   * Record template download
   */
  async recordDownload(
    templateId: string,
    customizationId?: string,
    format: string = 'pdf',
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('template_downloads')
      .insert({
        template_id: templateId,
        customization_id: customizationId,
        user_id: userId,
        session_id: sessionId,
        format,
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent
      });

    if (error) {
      console.error('Failed to record download:', error);
    }
  }

  /**
   * Rate a template
   */
  async rateTemplate(
    templateId: string,
    userId: string,
    rating: number,
    review?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('template_ratings')
      .upsert({
        template_id: templateId,
        user_id: userId,
        rating,
        review,
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to rate template: ${error.message}`);
    }
  }

  /**
   * Get template ratings and reviews
   */
  async getTemplateRatings(templateId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('template_ratings')
      .select(`
        *,
        user:profiles(id, email, first_name, last_name, avatar_url)
      `)
      .eq('template_id', templateId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch template ratings: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get user's rating for a specific template
   */
  async getUserTemplateRating(templateId: string, userId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('template_ratings')
      .select('*')
      .eq('template_id', templateId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch user rating: ${error.message}`);
    }

    return data;
  }

  /**
   * Track template analytics event
   */
  async trackEvent(
    templateId: string,
    eventType: string,
    eventData: Record<string, any> = {},
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('template_analytics')
      .insert({
        template_id: templateId,
        event_type: eventType,
        event_data: eventData,
        user_id: userId,
        session_id: sessionId,
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent
      });

    if (error) {
      console.error('Failed to track analytics event:', error);
    }
  }

  // Private helper methods

  private transformCategories(data: any[]): TemplateCategory[] {
    return data.map(item => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      icon: item.icon,
      parentId: item.parent_id,
      sortOrder: item.sort_order,
      isActive: item.is_active
    }));
  }

  private transformTemplates(data: any[]): Template[] {
    return data.map(item => this.transformTemplate(item));
  }

  private transformTemplate(data: any): Template {
    return {
      id: data.id,
      title: data.title,
      slug: data.slug,
      description: data.description,
      categoryId: data.category_id,
      subcategory: data.subcategory,
      content: data.content,
      fields: data.fields,
      previewHtml: data.preview_html,
      previewPdfUrl: data.preview_pdf_url,
      accessLevel: data.access_level,
      priceSgd: parseFloat(data.price_sgd || '0'),
      jurisdiction: data.jurisdiction,
      legalAreas: data.legal_areas || [],
      complianceTags: data.compliance_tags || [],
      downloadCount: data.download_count,
      ratingAverage: parseFloat(data.rating_average || '0'),
      ratingCount: data.rating_count,
      createdBy: data.created_by,
      isActive: data.is_active,
      isFeatured: data.is_featured,
      tags: data.tags || [],
      language: data.language,
      version: data.version,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      category: data.category ? {
        id: data.category.id,
        name: data.category.name,
        slug: data.category.slug,
        description: data.category.description,
        icon: data.category.icon,
        sortOrder: 0,
        isActive: true
      } : undefined
    };
  }

  private transformPopularTemplates(data: any[]): Template[] {
    return data.map(item => ({
      id: item.template_id,
      title: item.title,
      slug: '', // Not provided by the function
      description: item.description,
      categoryId: '',
      content: {},
      fields: [],
      accessLevel: 'public' as const,
      priceSgd: 0,
      jurisdiction: 'Singapore',
      legalAreas: [],
      complianceTags: [],
      downloadCount: item.download_count,
      ratingAverage: parseFloat(item.rating_average || '0'),
      ratingCount: item.rating_count,
      isActive: true,
      isFeatured: false,
      tags: [],
      language: 'en',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: {
        id: '',
        name: item.category_name,
        slug: '',
        sortOrder: 0,
        isActive: true
      }
    }));
  }

  private transformCustomization(data: any): TemplateCustomization {
    return {
      id: data.id,
      templateId: data.template_id,
      userId: data.user_id,
      sessionId: data.session_id,
      customFields: data.custom_fields,
      generatedContent: data.generated_content,
      generatedHtml: data.generated_html,
      generatedPdfUrl: data.generated_pdf_url,
      status: data.status,
      errorMessage: data.error_message,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private transformCustomizations(data: any[]): TemplateCustomization[] {
    return data.map(item => this.transformCustomization(item));
  }

  private async getFilterAggregations(filters: TemplateSearchFilters) {
    // Simplified implementation - in production, you'd want proper aggregation queries
    return {
      categories: [],
      priceRanges: [],
      tags: []
    };
  }

  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return '127.0.0.1';
    }
  }
}

export const templateMarketplaceService = new TemplateMarketplaceService();
