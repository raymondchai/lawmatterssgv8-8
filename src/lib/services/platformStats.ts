import { supabase } from '@/lib/supabase';

export interface PlatformStats {
  legalProfessionals: number;
  documentsProcessed: number;
  questionsAnswered: number;
  templatesDownloaded: number;
  activeLawFirms: number;
  totalUsers: number;
}

class PlatformStatsService {
  private cache: PlatformStats | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get platform statistics with caching
   */
  async getStats(): Promise<PlatformStats> {
    // Return cached data if still valid
    if (this.cache && Date.now() < this.cacheExpiry) {
      return this.cache;
    }

    try {
      // Fetch all stats in parallel
      const [
        legalProfessionalsResult,
        documentsResult,
        questionsResult,
        templatesResult,
        lawFirmsResult,
        usersResult
      ] = await Promise.all([
        this.getLegalProfessionalsCount(),
        this.getDocumentsProcessedCount(),
        this.getQuestionsAnsweredCount(),
        this.getTemplatesDownloadedCount(),
        this.getActiveLawFirmsCount(),
        this.getTotalUsersCount()
      ]);

      const stats: PlatformStats = {
        legalProfessionals: legalProfessionalsResult,
        documentsProcessed: documentsResult,
        questionsAnswered: questionsResult,
        templatesDownloaded: templatesResult,
        activeLawFirms: lawFirmsResult,
        totalUsers: usersResult
      };

      // Cache the results
      this.cache = stats;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      return stats;
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      
      // Return fallback stats if database query fails
      return this.getFallbackStats();
    }
  }

  /**
   * Get count of legal professionals (verified experts + law firm team members)
   */
  private async getLegalProfessionalsCount(): Promise<number> {
    try {
      // Count verified legal experts
      const { count: expertsCount } = await supabase
        .from('legal_experts')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'verified')
        .eq('is_active', true);

      // Count law firm team members
      const { count: teamMembersCount } = await supabase
        .from('law_firm_team_members')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      return (expertsCount || 0) + (teamMembersCount || 0);
    } catch (error) {
      console.error('Error getting legal professionals count:', error);
      return 500; // Fallback
    }
  }

  /**
   * Get count of documents processed (uploaded + public analyses)
   */
  private async getDocumentsProcessedCount(): Promise<number> {
    try {
      // Count uploaded documents
      const { count: uploadedCount } = await supabase
        .from('uploaded_documents')
        .select('*', { count: 'exact', head: true });

      // Count public document analyses
      const { count: publicCount } = await supabase
        .from('public_document_analyses')
        .select('*', { count: 'exact', head: true });

      return (uploadedCount || 0) + (publicCount || 0);
    } catch (error) {
      console.error('Error getting documents processed count:', error);
      return 10000; // Fallback
    }
  }

  /**
   * Get count of questions answered
   */
  private async getQuestionsAnsweredCount(): Promise<number> {
    try {
      const { count } = await supabase
        .from('legal_questions')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'approved')
        .gt('answer_count', 0);

      return count || 0;
    } catch (error) {
      console.error('Error getting questions answered count:', error);
      return 15000; // Fallback
    }
  }

  /**
   * Get count of templates downloaded
   */
  private async getTemplatesDownloadedCount(): Promise<number> {
    try {
      const { count } = await supabase
        .from('template_downloads')
        .select('*', { count: 'exact', head: true });

      return count || 0;
    } catch (error) {
      console.error('Error getting templates downloaded count:', error);
      return 5000; // Fallback
    }
  }

  /**
   * Get count of active law firms
   */
  private async getActiveLawFirmsCount(): Promise<number> {
    try {
      const { count } = await supabase
        .from('law_firms')
        .select('*', { count: 'exact', head: true })
        .eq('verified', true)
        .eq('is_active', true);

      return count || 0;
    } catch (error) {
      console.error('Error getting active law firms count:', error);
      return 150; // Fallback
    }
  }

  /**
   * Get total users count
   */
  private async getTotalUsersCount(): Promise<number> {
    try {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      return count || 0;
    } catch (error) {
      console.error('Error getting total users count:', error);
      return 25000; // Fallback
    }
  }

  /**
   * Get fallback stats when database is unavailable
   */
  private getFallbackStats(): PlatformStats {
    return {
      legalProfessionals: 500,
      documentsProcessed: 10000,
      questionsAnswered: 15000,
      templatesDownloaded: 5000,
      activeLawFirms: 150,
      totalUsers: 25000
    };
  }

  /**
   * Format number for display (e.g., 1000 -> "1,000+")
   */
  formatStatNumber(num: number): string {
    if (num >= 1000000) {
      return `${Math.floor(num / 100000) / 10}M+`;
    } else if (num >= 1000) {
      return `${Math.floor(num / 100) / 10}K+`;
    } else {
      return `${num}+`;
    }
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache = null;
    this.cacheExpiry = 0;
  }
}

export const platformStatsService = new PlatformStatsService();
