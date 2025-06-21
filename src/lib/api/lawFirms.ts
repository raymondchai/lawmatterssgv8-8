import { supabase } from '@/lib/supabase';
import type {
  LawFirm,
  LawFirmReview,
  LawFirmReviewVote,
  LawFirmTeamMember,
  LawFirmGalleryImage,
  LawFirmBooking
} from '@/types';

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

  // Enhanced Law Firm Profile Functions

  // Get law firm with full profile details
  async getLawFirmProfile(id: string): Promise<LawFirm & {
    team_members?: LawFirmTeamMember[];
    gallery?: LawFirmGalleryImage[];
    recent_reviews?: LawFirmReview[];
  }> {
    const { data: firm, error } = await supabase
      .from('law_firms')
      .select('*')
      .eq('id', id)
      .eq('verified', true)
      .single();

    if (error) {
      console.error('Error fetching law firm profile:', error);
      throw new Error('Failed to fetch law firm profile');
    }

    // Get team members
    const { data: teamMembers } = await supabase
      .from('law_firm_team_members')
      .select('*')
      .eq('law_firm_id', id)
      .eq('is_active', true)
      .order('order_index');

    // Get gallery images
    const { data: gallery } = await supabase
      .from('law_firm_gallery')
      .select('*')
      .eq('law_firm_id', id)
      .order('order_index');

    // Get recent reviews
    const { data: reviews } = await supabase
      .from('law_firm_reviews')
      .select(`
        *,
        user:profiles(full_name, avatar_url)
      `)
      .eq('law_firm_id', id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      ...firm,
      team_members: teamMembers || [],
      gallery: gallery || [],
      recent_reviews: reviews || []
    };
  },

  // Team Member Management
  async getTeamMembers(lawFirmId: string): Promise<LawFirmTeamMember[]> {
    const { data, error } = await supabase
      .from('law_firm_team_members')
      .select('*')
      .eq('law_firm_id', lawFirmId)
      .eq('is_active', true)
      .order('order_index');

    if (error) {
      console.error('Error fetching team members:', error);
      throw new Error('Failed to fetch team members');
    }

    return data || [];
  },

  async createTeamMember(teamMemberData: Omit<LawFirmTeamMember, 'id' | 'created_at' | 'updated_at'>): Promise<LawFirmTeamMember> {
    const { data, error } = await supabase
      .from('law_firm_team_members')
      .insert(teamMemberData)
      .select()
      .single();

    if (error) {
      console.error('Error creating team member:', error);
      throw new Error('Failed to create team member');
    }

    return data;
  },

  async updateTeamMember(id: string, updates: Partial<LawFirmTeamMember>): Promise<LawFirmTeamMember> {
    const { data, error } = await supabase
      .from('law_firm_team_members')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating team member:', error);
      throw new Error('Failed to update team member');
    }

    return data;
  },

  async deleteTeamMember(id: string): Promise<void> {
    const { error } = await supabase
      .from('law_firm_team_members')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting team member:', error);
      throw new Error('Failed to delete team member');
    }
  },

  // Gallery Management
  async getGalleryImages(lawFirmId: string): Promise<LawFirmGalleryImage[]> {
    const { data, error } = await supabase
      .from('law_firm_gallery')
      .select('*')
      .eq('law_firm_id', lawFirmId)
      .order('order_index');

    if (error) {
      console.error('Error fetching gallery images:', error);
      throw new Error('Failed to fetch gallery images');
    }

    return data || [];
  },

  async addGalleryImage(imageData: Omit<LawFirmGalleryImage, 'id' | 'created_at'>): Promise<LawFirmGalleryImage> {
    const { data, error } = await supabase
      .from('law_firm_gallery')
      .insert(imageData)
      .select()
      .single();

    if (error) {
      console.error('Error adding gallery image:', error);
      throw new Error('Failed to add gallery image');
    }

    return data;
  },

  async updateGalleryImage(id: string, updates: Partial<LawFirmGalleryImage>): Promise<LawFirmGalleryImage> {
    const { data, error } = await supabase
      .from('law_firm_gallery')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating gallery image:', error);
      throw new Error('Failed to update gallery image');
    }

    return data;
  },

  async deleteGalleryImage(id: string): Promise<void> {
    const { error } = await supabase
      .from('law_firm_gallery')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting gallery image:', error);
      throw new Error('Failed to delete gallery image');
    }
  },

  // Booking Management
  async createBooking(bookingData: Omit<LawFirmBooking, 'id' | 'created_at' | 'updated_at' | 'user' | 'team_member'>): Promise<LawFirmBooking> {
    const { data, error } = await supabase
      .from('law_firm_bookings')
      .insert(bookingData)
      .select(`
        *,
        user:profiles(full_name, email, phone),
        team_member:law_firm_team_members(*)
      `)
      .single();

    if (error) {
      console.error('Error creating booking:', error);
      throw new Error('Failed to create booking');
    }

    return data;
  },

  async getUserBookings(userId: string): Promise<LawFirmBooking[]> {
    const { data, error } = await supabase
      .from('law_firm_bookings')
      .select(`
        *,
        law_firm:law_firms(name, phone, email),
        team_member:law_firm_team_members(name, title, email, phone)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user bookings:', error);
      throw new Error('Failed to fetch user bookings');
    }

    return data || [];
  },

  async getLawFirmBookings(lawFirmId: string): Promise<LawFirmBooking[]> {
    const { data, error } = await supabase
      .from('law_firm_bookings')
      .select(`
        *,
        user:profiles(full_name, email, phone),
        team_member:law_firm_team_members(name, title)
      `)
      .eq('law_firm_id', lawFirmId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching law firm bookings:', error);
      throw new Error('Failed to fetch law firm bookings');
    }

    return data || [];
  },

  async updateBookingStatus(id: string, status: LawFirmBooking['status'], notes?: string): Promise<LawFirmBooking> {
    const updates: any = { status };
    if (notes) updates.notes = notes;

    const { data, error } = await supabase
      .from('law_firm_bookings')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        user:profiles(full_name, email, phone),
        team_member:law_firm_team_members(name, title)
      `)
      .single();

    if (error) {
      console.error('Error updating booking status:', error);
      throw new Error('Failed to update booking status');
    }

    return data;
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
