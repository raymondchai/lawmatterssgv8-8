import { supabase } from '@/lib/supabase';

export interface TemplateAnalyticsData {
  // Overview metrics
  totalTemplates: number;
  totalDownloads: number;
  totalRevenue: number;
  totalUsers: number;
  
  // Time-based metrics
  downloadsThisMonth: number;
  revenueThisMonth: number;
  newUsersThisMonth: number;
  
  // Popular templates
  popularTemplates: Array<{
    id: string;
    title: string;
    downloadCount: number;
    revenue: number;
    category: string;
  }>;
  
  // Category performance
  categoryStats: Array<{
    categoryId: string;
    categoryName: string;
    templateCount: number;
    downloadCount: number;
    revenue: number;
  }>;
  
  // User engagement
  userEngagement: {
    averageSessionDuration: number;
    bounceRate: number;
    conversionRate: number;
    repeatUsers: number;
  };
  
  // Revenue breakdown
  revenueBreakdown: {
    public: number;
    premium: number;
    enterprise: number;
  };
  
  // Download trends (last 30 days)
  downloadTrends: Array<{
    date: string;
    downloads: number;
    revenue: number;
  }>;
  
  // Format preferences
  formatStats: Array<{
    format: string;
    count: number;
    percentage: number;
  }>;
}

export interface TemplatePerformanceMetrics {
  templateId: string;
  title: string;
  views: number;
  customizations: number;
  downloads: number;
  revenue: number;
  rating: number;
  conversionRate: number;
  lastUpdated: Date;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  averageOrderValue: number;
  topRevenueTemplates: Array<{
    templateId: string;
    title: string;
    revenue: number;
    downloads: number;
  }>;
}

class TemplateAnalyticsService {
  /**
   * Get comprehensive analytics dashboard data
   */
  async getDashboardAnalytics(dateRange?: { start: Date; end: Date }): Promise<TemplateAnalyticsData> {
    try {
      const endDate = dateRange?.end || new Date();
      const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      // Get overview metrics
      const [
        templatesResult,
        downloadsResult,
        revenueResult,
        usersResult
      ] = await Promise.all([
        this.getTotalTemplates(),
        this.getTotalDownloads(),
        this.getTotalRevenue(),
        this.getTotalUsers()
      ]);

      // Get time-based metrics
      const [
        monthlyDownloads,
        monthlyRevenue,
        newUsers
      ] = await Promise.all([
        this.getDownloadsInPeriod(startDate, endDate),
        this.getRevenueInPeriod(startDate, endDate),
        this.getNewUsersInPeriod(startDate, endDate)
      ]);

      // Get detailed analytics
      const [
        popularTemplates,
        categoryStats,
        userEngagement,
        revenueBreakdown,
        downloadTrends,
        formatStats
      ] = await Promise.all([
        this.getPopularTemplates(10),
        this.getCategoryStats(),
        this.getUserEngagementMetrics(startDate, endDate),
        this.getRevenueBreakdown(),
        this.getDownloadTrends(startDate, endDate),
        this.getFormatStats()
      ]);

      return {
        totalTemplates: templatesResult,
        totalDownloads: downloadsResult,
        totalRevenue: revenueResult,
        totalUsers: usersResult,
        downloadsThisMonth: monthlyDownloads,
        revenueThisMonth: monthlyRevenue,
        newUsersThisMonth: newUsers,
        popularTemplates,
        categoryStats,
        userEngagement,
        revenueBreakdown,
        downloadTrends,
        formatStats
      };
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      throw new Error('Failed to fetch analytics data');
    }
  }

  /**
   * Get template performance metrics
   */
  async getTemplatePerformance(templateId?: string): Promise<TemplatePerformanceMetrics[]> {
    try {
      let query = supabase
        .from('templates')
        .select(`
          id,
          title,
          download_count,
          rating_average,
          updated_at,
          template_analytics!inner(event_type),
          template_downloads!inner(format),
          template_customizations!inner(id)
        `);

      if (templateId) {
        query = query.eq('id', templateId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process the data to calculate metrics
      return data.map(template => {
        const views = template.template_analytics?.filter(a => a.event_type === 'template_view').length || 0;
        const customizations = template.template_customizations?.length || 0;
        const downloads = template.download_count || 0;
        
        return {
          templateId: template.id,
          title: template.title,
          views,
          customizations,
          downloads,
          revenue: downloads * 50, // Placeholder calculation
          rating: template.rating_average || 0,
          conversionRate: views > 0 ? (downloads / views) * 100 : 0,
          lastUpdated: new Date(template.updated_at)
        };
      });
    } catch (error) {
      console.error('Error fetching template performance:', error);
      throw new Error('Failed to fetch template performance data');
    }
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(): Promise<RevenueAnalytics> {
    try {
      const totalRevenue = await this.getTotalRevenue();
      const monthlyRevenue = await this.getRevenueInPeriod(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      );
      
      const previousMonthRevenue = await this.getRevenueInPeriod(
        new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );

      const revenueGrowth = previousMonthRevenue > 0 
        ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
        : 0;

      const topRevenueTemplates = await this.getTopRevenueTemplates(5);
      const averageOrderValue = await this.getAverageOrderValue();

      return {
        totalRevenue,
        monthlyRevenue,
        revenueGrowth,
        averageOrderValue,
        topRevenueTemplates
      };
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      throw new Error('Failed to fetch revenue analytics');
    }
  }

  // Private helper methods
  private async getTotalTemplates(): Promise<number> {
    const { count, error } = await supabase
      .from('templates')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    if (error) throw error;
    return count || 0;
  }

  private async getTotalDownloads(): Promise<number> {
    const { count, error } = await supabase
      .from('template_downloads')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    return count || 0;
  }

  private async getTotalRevenue(): Promise<number> {
    // This would need to be calculated based on actual pricing and downloads
    // For now, using a placeholder calculation
    const downloads = await this.getTotalDownloads();
    return downloads * 25; // Average price placeholder
  }

  private async getTotalUsers(): Promise<number> {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    return count || 0;
  }

  private async getDownloadsInPeriod(start: Date, end: Date): Promise<number> {
    const { count, error } = await supabase
      .from('template_downloads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());
    
    if (error) throw error;
    return count || 0;
  }

  private async getRevenueInPeriod(start: Date, end: Date): Promise<number> {
    const downloads = await this.getDownloadsInPeriod(start, end);
    return downloads * 25; // Placeholder calculation
  }

  private async getNewUsersInPeriod(start: Date, end: Date): Promise<number> {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());
    
    if (error) throw error;
    return count || 0;
  }

  private async getPopularTemplates(limit: number = 10) {
    const { data, error } = await supabase
      .from('templates')
      .select(`
        id,
        title,
        download_count,
        price_sgd,
        categories(name)
      `)
      .eq('is_active', true)
      .order('download_count', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(template => ({
      id: template.id,
      title: template.title,
      downloadCount: template.download_count || 0,
      revenue: (template.download_count || 0) * (template.price_sgd || 0),
      category: template.categories?.name || 'Uncategorized'
    }));
  }

  private async getCategoryStats() {
    const { data, error } = await supabase
      .from('template_categories')
      .select(`
        id,
        name,
        templates(id, download_count, price_sgd)
      `);

    if (error) throw error;

    return data.map(category => ({
      categoryId: category.id,
      categoryName: category.name,
      templateCount: category.templates?.length || 0,
      downloadCount: category.templates?.reduce((sum, t) => sum + (t.download_count || 0), 0) || 0,
      revenue: category.templates?.reduce((sum, t) => sum + ((t.download_count || 0) * (t.price_sgd || 0)), 0) || 0
    }));
  }

  private async getUserEngagementMetrics(start: Date, end: Date) {
    // Placeholder implementation - would need more sophisticated analytics
    return {
      averageSessionDuration: 180, // 3 minutes
      bounceRate: 35.5,
      conversionRate: 12.8,
      repeatUsers: 45
    };
  }

  private async getRevenueBreakdown() {
    // Placeholder implementation
    return {
      public: 0,
      premium: 15000,
      enterprise: 8500
    };
  }

  private async getDownloadTrends(start: Date, end: Date) {
    // Placeholder implementation - would need daily aggregation
    const trends = [];
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < days; i++) {
      const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      trends.push({
        date: date.toISOString().split('T')[0],
        downloads: Math.floor(Math.random() * 50) + 10,
        revenue: Math.floor(Math.random() * 1000) + 200
      });
    }
    
    return trends;
  }

  private async getFormatStats() {
    const { data, error } = await supabase
      .from('template_downloads')
      .select('format');

    if (error) throw error;

    const formatCounts = data.reduce((acc, download) => {
      acc[download.format] = (acc[download.format] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(formatCounts).reduce((sum, count) => sum + count, 0);

    return Object.entries(formatCounts).map(([format, count]) => ({
      format,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  }

  private async getTopRevenueTemplates(limit: number = 5) {
    const { data, error } = await supabase
      .from('templates')
      .select(`
        id,
        title,
        download_count,
        price_sgd
      `)
      .eq('is_active', true)
      .order('download_count', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(template => ({
      templateId: template.id,
      title: template.title,
      revenue: (template.download_count || 0) * (template.price_sgd || 0),
      downloads: template.download_count || 0
    }));
  }

  private async getAverageOrderValue(): Promise<number> {
    // Placeholder calculation
    const totalRevenue = await this.getTotalRevenue();
    const totalDownloads = await this.getTotalDownloads();
    
    return totalDownloads > 0 ? totalRevenue / totalDownloads : 0;
  }
}

export const templateAnalyticsService = new TemplateAnalyticsService();
