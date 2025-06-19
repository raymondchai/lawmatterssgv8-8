import { supabase } from '@/lib/supabase';
import type { LawFirm, LawFirmReview, LawFirmReviewVote } from '@/types';

export interface LawFirmFilters {
  practiceAreas?: string[];
  location?: string;
  rating?: number;
  verified?: boolean;
  search?: string;
}

export interface CreateLawFirmData {
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  practice_areas: string[];
}

export interface CreateReviewData {
  law_firm_id: string;
  rating: number;
  title: string;
  content: string;
}

export const lawFirmsApi = {
  // Get all verified law firms
  async getLawFirms(filters: LawFirmFilters = {}): Promise<LawFirm[]> {
    let query = supabase
      .from('law_firms')
      .select('*')
      .eq('verified', true)
      .order('rating', { ascending: false });

    // Apply filters
    if (filters.practiceAreas && filters.practiceAreas.length > 0) {
      query = query.overlaps('practice_areas', filters.practiceAreas);
    }

    if (filters.location) {
      query = query.ilike('address', `%${filters.location}%`);
    }

    if (filters.rating) {
      query = query.gte('rating', filters.rating);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching law firms:', error);
      throw new Error('Failed to fetch law firms');
    }

    return data || [];
  },

  // Get a single law firm by ID
  async getLawFirm(id: string): Promise<LawFirm> {
    const { data, error } = await supabase
      .from('law_firms')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching law firm:', error);
      throw new Error('Failed to fetch law firm');
    }

    if (!data) {
      throw new Error('Law firm not found');
    }

    return data;
  },

  // Create a new law firm (admin only)
  async createLawFirm(lawFirmData: CreateLawFirmData): Promise<LawFirm> {
    const { data, error } = await supabase
      .from('law_firms')
      .insert({
        ...lawFirmData,
        verified: false // New law firms start unverified
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating law firm:', error);
      throw new Error('Failed to create law firm');
    }

    return data;
  },

  // Update a law firm (admin only)
  async updateLawFirm(id: string, updates: Partial<CreateLawFirmData>): Promise<LawFirm> {
    const { data, error } = await supabase
      .from('law_firms')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating law firm:', error);
      throw new Error('Failed to update law firm');
    }

    return data;
  },

  // Verify a law firm (admin only)
  async verifyLawFirm(id: string, verified: boolean = true): Promise<LawFirm> {
    const { data, error } = await supabase
      .from('law_firms')
      .update({ verified })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error verifying law firm:', error);
      throw new Error('Failed to verify law firm');
    }

    return data;
  },

  // Delete a law firm (admin only)
  async deleteLawFirm(id: string): Promise<void> {
    const { error } = await supabase
      .from('law_firms')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting law firm:', error);
      throw new Error('Failed to delete law firm');
    }
  },

  // Get reviews for a law firm
  async getLawFirmReviews(lawFirmId: string): Promise<LawFirmReview[]> {
    const { data, error } = await supabase
      .from('law_firm_reviews')
      .select(`
        *,
        user:profiles(full_name, avatar_url)
      `)
      .eq('law_firm_id', lawFirmId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      throw new Error('Failed to fetch reviews');
    }

    return data || [];
  },

  // Create a review
  async createReview(reviewData: CreateReviewData): Promise<LawFirmReview> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('law_firm_reviews')
      .insert({
        ...reviewData,
        user_id: user.id,
        status: 'pending' // Reviews start as pending
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating review:', error);
      throw new Error('Failed to create review');
    }

    return data;
  },

  // Update a review
  async updateReview(id: string, updates: Partial<CreateReviewData>): Promise<LawFirmReview> {
    const { data, error } = await supabase
      .from('law_firm_reviews')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating review:', error);
      throw new Error('Failed to update review');
    }

    return data;
  },

  // Delete a review
  async deleteReview(id: string): Promise<void> {
    const { error } = await supabase
      .from('law_firm_reviews')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting review:', error);
      throw new Error('Failed to delete review');
    }
  },

  // Approve/reject a review (admin only)
  async moderateReview(id: string, status: 'approved' | 'rejected'): Promise<LawFirmReview> {
    const { data, error } = await supabase
      .from('law_firm_reviews')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error moderating review:', error);
      throw new Error('Failed to moderate review');
    }

    return data;
  },

  // Vote on a review (helpful/not helpful)
  async voteOnReview(reviewId: string, isHelpful: boolean): Promise<LawFirmReviewVote> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Use upsert to handle updating existing votes
    const { data, error } = await supabase
      .from('law_firm_review_votes')
      .upsert({
        review_id: reviewId,
        user_id: user.id,
        is_helpful: isHelpful
      })
      .select()
      .single();

    if (error) {
      console.error('Error voting on review:', error);
      throw new Error('Failed to vote on review');
    }

    return data;
  },

  // Remove vote on a review
  async removeVoteOnReview(reviewId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('law_firm_review_votes')
      .delete()
      .eq('review_id', reviewId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error removing vote:', error);
      throw new Error('Failed to remove vote');
    }
  },

  // Get practice areas (for filters)
  async getPracticeAreas(): Promise<string[]> {
    const { data, error } = await supabase
      .from('law_firms')
      .select('practice_areas')
      .eq('verified', true);

    if (error) {
      console.error('Error fetching practice areas:', error);
      throw new Error('Failed to fetch practice areas');
    }

    // Flatten and deduplicate practice areas
    const allAreas = data?.flatMap(firm => firm.practice_areas) || [];
    return [...new Set(allAreas)].sort();
  },

  // Search law firms
  async searchLawFirms(query: string, filters: LawFirmFilters = {}): Promise<LawFirm[]> {
    return this.getLawFirms({ ...filters, search: query });
  },

  // Get top-rated law firms
  async getTopRatedLawFirms(limit: number = 10): Promise<LawFirm[]> {
    const { data, error } = await supabase
      .from('law_firms')
      .select('*')
      .eq('verified', true)
      .gte('rating', 4.0)
      .order('rating', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching top-rated law firms:', error);
      throw new Error('Failed to fetch top-rated law firms');
    }

    return data || [];
  },

  // Get recently added law firms
  async getRecentLawFirms(limit: number = 5): Promise<LawFirm[]> {
    const { data, error } = await supabase
      .from('law_firms')
      .select('*')
      .eq('verified', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent law firms:', error);
      throw new Error('Failed to fetch recent law firms');
    }

    return data || [];
  }
};
