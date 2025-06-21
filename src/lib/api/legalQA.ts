import { supabase } from '@/lib/supabase';
import type { 
  LegalQuestion, 
  LegalAnswer, 
  LegalQACategory, 
  LegalExpert,
  LegalQAVote,
  LegalQAComment,
  LegalQABookmark,
  LegalQAReport,
  LegalQAFilters,
  LegalAnswerFilters,
  AIAnswerRequest,
  AIAnswerResponse
} from '@/types';

export const legalQAApi = {
  // Categories
  async getCategories(): Promise<LegalQACategory[]> {
    const { data, error } = await supabase
      .from('legal_qa_categories')
      .select('*')
      .eq('is_active', true)
      .order('order_index');

    if (error) {
      console.error('Error fetching Q&A categories:', error);
      throw new Error('Failed to fetch Q&A categories');
    }

    return data || [];
  },

  async getCategoryWithQuestionCount(categoryId: string): Promise<LegalQACategory> {
    const { data, error } = await supabase
      .from('legal_qa_categories')
      .select(`
        *,
        question_count:legal_questions(count)
      `)
      .eq('id', categoryId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching category:', error);
      throw new Error('Failed to fetch category');
    }

    return data;
  },

  // Questions
  async getQuestions(filters: LegalQAFilters = {}): Promise<LegalQuestion[]> {
    let query = supabase
      .from('legal_questions')
      .select(`
        *,
        user:profiles(id, full_name, avatar_url),
        category:legal_qa_categories(id, name, color),
        answer_count,
        has_expert_answer,
        has_ai_answer
      `)
      .eq('moderation_status', 'approved');

    // Apply filters
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.urgency_level) {
      query = query.eq('urgency_level', filters.urgency_level);
    }

    if (filters.has_expert_answer !== undefined) {
      query = query.eq('has_expert_answer', filters.has_expert_answer);
    }

    if (filters.has_ai_answer !== undefined) {
      query = query.eq('has_ai_answer', filters.has_ai_answer);
    }

    if (filters.featured !== undefined) {
      query = query.eq('featured', filters.featured);
    }

    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%,tags.cs.{${filters.search}}`);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    // Apply sorting
    switch (filters.sort_by) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'most_votes':
        query = query.order('upvote_count', { ascending: false });
        break;
      case 'most_answers':
        query = query.order('answer_count', { ascending: false });
        break;
      case 'most_views':
        query = query.order('view_count', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Apply pagination
    const limit = filters.limit || 20;
    const offset = ((filters.page || 1) - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching questions:', error);
      throw new Error('Failed to fetch questions');
    }

    return data || [];
  },

  async getQuestion(id: string): Promise<LegalQuestion> {
    const { data, error } = await supabase
      .from('legal_questions')
      .select(`
        *,
        user:profiles(id, full_name, avatar_url),
        category:legal_qa_categories(id, name, color, description)
      `)
      .eq('id', id)
      .eq('moderation_status', 'approved')
      .single();

    if (error) {
      console.error('Error fetching question:', error);
      throw new Error('Failed to fetch question');
    }

    // Increment view count
    await supabase
      .from('legal_questions')
      .update({ view_count: data.view_count + 1 })
      .eq('id', id);

    return data;
  },

  async createQuestion(questionData: Omit<LegalQuestion, 'id' | 'created_at' | 'updated_at' | 'view_count' | 'upvote_count' | 'downvote_count' | 'answer_count' | 'has_expert_answer' | 'has_ai_answer' | 'featured' | 'moderation_status'>): Promise<LegalQuestion> {
    const { data, error } = await supabase
      .from('legal_questions')
      .insert({
        ...questionData,
        moderation_status: 'pending'
      })
      .select(`
        *,
        user:profiles(id, full_name, avatar_url),
        category:legal_qa_categories(id, name, color)
      `)
      .single();

    if (error) {
      console.error('Error creating question:', error);
      throw new Error('Failed to create question');
    }

    return data;
  },

  async updateQuestion(id: string, updates: Partial<LegalQuestion>): Promise<LegalQuestion> {
    const { data, error } = await supabase
      .from('legal_questions')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        user:profiles(id, full_name, avatar_url),
        category:legal_qa_categories(id, name, color)
      `)
      .single();

    if (error) {
      console.error('Error updating question:', error);
      throw new Error('Failed to update question');
    }

    return data;
  },

  // Answers
  async getAnswers(filters: LegalAnswerFilters = {}): Promise<LegalAnswer[]> {
    let query = supabase
      .from('legal_answers')
      .select(`
        *,
        user:profiles(id, full_name, avatar_url),
        expert:legal_experts(
          id,
          specializations,
          years_experience,
          verification_status,
          user:profiles(id, full_name, avatar_url),
          law_firm:law_firms(id, name, logo_url)
        )
      `)
      .eq('moderation_status', 'approved');

    if (filters.question_id) {
      query = query.eq('question_id', filters.question_id);
    }

    if (filters.answer_type) {
      query = query.eq('answer_type', filters.answer_type);
    }

    if (filters.expert_verified !== undefined) {
      query = query.eq('expert_verified', filters.expert_verified);
    }

    if (filters.is_accepted !== undefined) {
      query = query.eq('is_accepted', filters.is_accepted);
    }

    // Apply sorting
    switch (filters.sort_by) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'most_votes':
        query = query.order('upvote_count', { ascending: false });
        break;
      case 'most_helpful':
        query = query.order('helpful_count', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Prioritize accepted answers
    query = query.order('is_accepted', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching answers:', error);
      throw new Error('Failed to fetch answers');
    }

    return data || [];
  },

  async createAnswer(answerData: Omit<LegalAnswer, 'id' | 'created_at' | 'updated_at' | 'upvote_count' | 'downvote_count' | 'helpful_count' | 'expert_verified' | 'moderation_status'>): Promise<LegalAnswer> {
    const { data, error } = await supabase
      .from('legal_answers')
      .insert({
        ...answerData,
        moderation_status: 'pending'
      })
      .select(`
        *,
        user:profiles(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error creating answer:', error);
      throw new Error('Failed to create answer');
    }

    return data;
  },

  async updateAnswer(id: string, updates: Partial<LegalAnswer>): Promise<LegalAnswer> {
    const { data, error } = await supabase
      .from('legal_answers')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        user:profiles(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error updating answer:', error);
      throw new Error('Failed to update answer');
    }

    return data;
  },

  // AI Answer Generation
  async generateAIAnswer(request: AIAnswerRequest): Promise<AIAnswerResponse> {
    try {
      // This would integrate with your AI service (OpenAI, Claude, etc.)
      // For now, we'll return a mock response
      const mockResponse: AIAnswerResponse = {
        content: `Based on Singapore law and the information provided, here's a general overview:

${request.question_content}

This appears to be related to ${request.category || 'general legal matters'}. In Singapore, such matters are typically governed by relevant statutes and case law.

**Key considerations:**
1. Legal requirements and procedures
2. Relevant timeframes and deadlines
3. Potential consequences and remedies
4. Professional legal advice recommendations

**Next steps:**
- Consult with a qualified legal professional
- Gather relevant documentation
- Consider alternative dispute resolution if applicable`,
        sources: [
          'Singapore Statutes Online',
          'Singapore Law Reports',
          'Legal Service Commission Guidelines'
        ],
        disclaimer: 'This AI-generated response is for informational purposes only and does not constitute legal advice. Please consult with a qualified legal professional for advice specific to your situation.',
        confidence_score: 0.75,
        suggested_experts: []
      };

      // Create AI answer in database
      await this.createAnswer({
        question_id: request.question_id,
        content: mockResponse.content,
        answer_type: 'ai',
        sources: mockResponse.sources,
        disclaimer: mockResponse.disclaimer,
        is_accepted: false
      });

      return mockResponse;
    } catch (error) {
      console.error('Error generating AI answer:', error);
      throw new Error('Failed to generate AI answer');
    }
  },

  // Voting
  async voteOnQuestion(questionId: string, voteType: 'upvote' | 'downvote'): Promise<void> {
    // First, remove any existing vote
    await supabase
      .from('legal_qa_votes')
      .delete()
      .eq('question_id', questionId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

    // Then add the new vote
    const { error } = await supabase
      .from('legal_qa_votes')
      .insert({
        question_id: questionId,
        vote_type: voteType,
        user_id: (await supabase.auth.getUser()).data.user?.id
      });

    if (error) {
      console.error('Error voting on question:', error);
      throw new Error('Failed to vote on question');
    }
  },

  async voteOnAnswer(answerId: string, voteType: 'upvote' | 'downvote' | 'helpful'): Promise<void> {
    // First, remove any existing vote of the same type
    await supabase
      .from('legal_qa_votes')
      .delete()
      .eq('answer_id', answerId)
      .eq('vote_type', voteType)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

    // Then add the new vote
    const { error } = await supabase
      .from('legal_qa_votes')
      .insert({
        answer_id: answerId,
        vote_type: voteType,
        user_id: (await supabase.auth.getUser()).data.user?.id
      });

    if (error) {
      console.error('Error voting on answer:', error);
      throw new Error('Failed to vote on answer');
    }
  },

  async getUserVote(questionId?: string, answerId?: string): Promise<LegalQAVote | null> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return null;

    let query = supabase
      .from('legal_qa_votes')
      .select('*')
      .eq('user_id', userId);

    if (questionId) {
      query = query.eq('question_id', questionId);
    }

    if (answerId) {
      query = query.eq('answer_id', answerId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user vote:', error);
      return null;
    }

    return data;
  },

  // Bookmarks
  async bookmarkQuestion(questionId: string): Promise<void> {
    const { error } = await supabase
      .from('legal_qa_bookmarks')
      .insert({
        question_id: questionId,
        user_id: (await supabase.auth.getUser()).data.user?.id
      });

    if (error) {
      console.error('Error bookmarking question:', error);
      throw new Error('Failed to bookmark question');
    }
  },

  async unbookmarkQuestion(questionId: string): Promise<void> {
    const { error } = await supabase
      .from('legal_qa_bookmarks')
      .delete()
      .eq('question_id', questionId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

    if (error) {
      console.error('Error unbookmarking question:', error);
      throw new Error('Failed to unbookmark question');
    }
  },

  async getUserBookmarks(): Promise<LegalQuestion[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return [];

    const { data, error } = await supabase
      .from('legal_qa_bookmarks')
      .select(`
        question:legal_questions(
          *,
          user:profiles(id, full_name, avatar_url),
          category:legal_qa_categories(id, name, color)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookmarks:', error);
      throw new Error('Failed to fetch bookmarks');
    }

    return data?.map(item => item.question).filter(Boolean) || [];
  },

  // Comments
  async getComments(questionId?: string, answerId?: string): Promise<LegalQAComment[]> {
    let query = supabase
      .from('legal_qa_comments')
      .select(`
        *,
        user:profiles(id, full_name, avatar_url)
      `)
      .eq('moderation_status', 'approved')
      .is('parent_id', null)
      .order('created_at', { ascending: true });

    if (questionId) {
      query = query.eq('question_id', questionId);
    }

    if (answerId) {
      query = query.eq('answer_id', answerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching comments:', error);
      throw new Error('Failed to fetch comments');
    }

    return data || [];
  },

  async createComment(commentData: Omit<LegalQAComment, 'id' | 'created_at' | 'updated_at' | 'upvote_count' | 'moderation_status'>): Promise<LegalQAComment> {
    const { data, error } = await supabase
      .from('legal_qa_comments')
      .insert({
        ...commentData,
        moderation_status: 'approved' // Comments are auto-approved for now
      })
      .select(`
        *,
        user:profiles(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      throw new Error('Failed to create comment');
    }

    return data;
  },

  // Expert functions
  async getExperts(specialization?: string): Promise<LegalExpert[]> {
    let query = supabase
      .from('legal_experts')
      .select(`
        *,
        user:profiles(id, full_name, avatar_url, email),
        law_firm:law_firms(id, name, logo_url)
      `)
      .eq('verification_status', 'verified')
      .eq('is_active', true)
      .order('expertise_score', { ascending: false });

    if (specialization) {
      query = query.contains('specializations', [specialization]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching experts:', error);
      throw new Error('Failed to fetch experts');
    }

    return data || [];
  },

  async createExpertProfile(expertData: Omit<LegalExpert, 'id' | 'created_at' | 'updated_at' | 'expertise_score' | 'answer_count' | 'helpful_answer_count' | 'verification_status'>): Promise<LegalExpert> {
    const { data, error } = await supabase
      .from('legal_experts')
      .insert({
        ...expertData,
        verification_status: 'pending'
      })
      .select(`
        *,
        user:profiles(id, full_name, avatar_url, email)
      `)
      .single();

    if (error) {
      console.error('Error creating expert profile:', error);
      throw new Error('Failed to create expert profile');
    }

    return data;
  },

  // Reports
  async reportContent(reportData: Omit<LegalQAReport, 'id' | 'created_at' | 'status'>): Promise<void> {
    const { error } = await supabase
      .from('legal_qa_reports')
      .insert({
        ...reportData,
        status: 'pending'
      });

    if (error) {
      console.error('Error reporting content:', error);
      throw new Error('Failed to report content');
    }
  },

  // Search
  async searchQuestions(query: string, filters: LegalQAFilters = {}): Promise<LegalQuestion[]> {
    return this.getQuestions({
      ...filters,
      search: query
    });
  },

  async getTrendingQuestions(limit: number = 10): Promise<LegalQuestion[]> {
    return this.getQuestions({
      sort_by: 'most_views',
      limit,
      featured: true
    });
  },

  async getRecentQuestions(limit: number = 10): Promise<LegalQuestion[]> {
    return this.getQuestions({
      sort_by: 'newest',
      limit
    });
  }
};
