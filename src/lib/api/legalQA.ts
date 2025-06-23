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

// Check if we're using placeholder Supabase configuration
const isPlaceholder = import.meta.env.VITE_SUPABASE_URL?.includes('placeholder') ||
                      !import.meta.env.VITE_SUPABASE_URL ||
                      import.meta.env.VITE_SUPABASE_URL === '' ||
                      import.meta.env.VITE_SUPABASE_URL === 'your-project-url';

// Mock data for development
const mockCategories: LegalQACategory[] = [
  {
    id: '1',
    name: 'Employment Law',
    description: 'Questions about workplace rights, contracts, and employment issues',
    icon: 'briefcase',
    color: '#3B82F6',
    parent_id: null,
    order_index: 1,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    question_count: 45
  },
  {
    id: '2',
    name: 'Property Law',
    description: 'Real estate transactions, property disputes, and housing matters',
    icon: 'home',
    color: '#10B981',
    parent_id: null,
    order_index: 2,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    question_count: 32
  },
  {
    id: '3',
    name: 'Family Law',
    description: 'Divorce, custody, marriage, and family-related legal matters',
    icon: 'users',
    color: '#F59E0B',
    parent_id: null,
    order_index: 3,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    question_count: 28
  },
  {
    id: '4',
    name: 'Business Law',
    description: 'Corporate law, contracts, and business-related legal issues',
    icon: 'building',
    color: '#8B5CF6',
    parent_id: null,
    order_index: 4,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    question_count: 38
  },
  {
    id: '5',
    name: 'Criminal Law',
    description: 'Criminal charges, court proceedings, and criminal defense',
    icon: 'shield',
    color: '#EF4444',
    parent_id: null,
    order_index: 5,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    question_count: 22
  }
];

const mockQuestions: LegalQuestion[] = [
  {
    id: '1',
    user_id: 'user1',
    category_id: '1',
    title: 'Can my employer terminate me without notice during probation?',
    content: 'I am currently on a 6-month probation period at my new job in Singapore. My employer mentioned they can terminate me without notice during this period. Is this legal? What are my rights as an employee during probation?',
    tags: ['employment', 'probation', 'termination', 'singapore'],
    urgency_level: 'high',
    location: 'Singapore',
    is_anonymous: false,
    status: 'open',
    view_count: 156,
    upvote_count: 12,
    downvote_count: 1,
    answer_count: 3,
    has_expert_answer: true,
    has_ai_answer: true,
    featured: true,
    moderation_status: 'approved',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    user: {
      id: 'user1',
      full_name: 'Sarah Chen',
      avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150'
    },
    category: mockCategories[0]
  },
  {
    id: '2',
    user_id: 'user2',
    category_id: '2',
    title: 'Property cooling measures - impact on first-time buyers',
    content: 'With the recent property cooling measures announced by the government, how will this affect first-time home buyers in Singapore? Are there any exemptions or special considerations for citizens buying their first property?',
    tags: ['property', 'cooling-measures', 'first-time-buyer', 'hdb'],
    urgency_level: 'normal',
    location: 'Singapore',
    is_anonymous: false,
    status: 'open',
    view_count: 89,
    upvote_count: 8,
    downvote_count: 0,
    answer_count: 2,
    has_expert_answer: false,
    has_ai_answer: true,
    featured: false,
    moderation_status: 'approved',
    created_at: '2024-01-14T14:20:00Z',
    updated_at: '2024-01-14T14:20:00Z',
    user: {
      id: 'user2',
      full_name: 'Michael Tan',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
    },
    category: mockCategories[1]
  },
  {
    id: '3',
    user_id: 'user3',
    category_id: '3',
    title: 'Divorce proceedings and child custody arrangements',
    content: 'My spouse and I are considering divorce. We have two young children (ages 5 and 8). What factors do Singapore courts consider when determining child custody? Can we arrange for joint custody?',
    tags: ['divorce', 'child-custody', 'family-court', 'joint-custody'],
    urgency_level: 'high',
    location: 'Singapore',
    is_anonymous: true,
    status: 'open',
    view_count: 234,
    upvote_count: 15,
    downvote_count: 2,
    answer_count: 4,
    has_expert_answer: true,
    has_ai_answer: false,
    featured: true,
    moderation_status: 'approved',
    created_at: '2024-01-13T09:15:00Z',
    updated_at: '2024-01-13T09:15:00Z',
    user: {
      id: 'user3',
      full_name: 'Anonymous User',
      avatar_url: undefined
    },
    category: mockCategories[2]
  },
  {
    id: '4',
    user_id: 'user4',
    category_id: '4',
    title: 'Setting up a private limited company in Singapore',
    content: 'I want to incorporate a private limited company in Singapore. What are the minimum requirements, costs involved, and ongoing compliance obligations? Do I need a local director?',
    tags: ['incorporation', 'private-limited', 'company-setup', 'compliance'],
    urgency_level: 'normal',
    location: 'Singapore',
    is_anonymous: false,
    status: 'open',
    view_count: 67,
    upvote_count: 6,
    downvote_count: 0,
    answer_count: 1,
    has_expert_answer: false,
    has_ai_answer: true,
    featured: false,
    moderation_status: 'approved',
    created_at: '2024-01-12T16:45:00Z',
    updated_at: '2024-01-12T16:45:00Z',
    user: {
      id: 'user4',
      full_name: 'David Lim',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    },
    category: mockCategories[3]
  },
  {
    id: '5',
    user_id: 'user5',
    category_id: '5',
    title: 'Traffic violation - what are my options?',
    content: 'I received a traffic summons for speeding. This is my first offense. What are my options? Should I plead guilty or contest it in court? What are the potential penalties?',
    tags: ['traffic-violation', 'speeding', 'summons', 'first-offense'],
    urgency_level: 'low',
    location: 'Singapore',
    is_anonymous: false,
    status: 'open',
    view_count: 45,
    upvote_count: 3,
    downvote_count: 0,
    answer_count: 0,
    has_expert_answer: false,
    has_ai_answer: false,
    featured: false,
    moderation_status: 'approved',
    created_at: '2024-01-11T11:30:00Z',
    updated_at: '2024-01-11T11:30:00Z',
    user: {
      id: 'user5',
      full_name: 'Jennifer Wong',
      avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'
    },
    category: mockCategories[4]
  }
];

export const legalQAApi = {
  // Categories
  async getCategories(): Promise<LegalQACategory[]> {
    console.log('getCategories called, isPlaceholder:', isPlaceholder);

    try {
      const { data, error } = await supabase
        .from('legal_qa_categories')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (error) {
        console.error('Error fetching Q&A categories:', error);
        // Fall back to mock data on error
        console.log('Falling back to mock categories');
        return [...mockCategories];
      }

      console.log('Categories loaded from database:', data?.length);
      return data || [];
    } catch (err) {
      console.error('Exception in getCategories:', err);
      // Fall back to mock data on exception
      return [...mockCategories];
    }
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
    console.log('getQuestions called, isPlaceholder:', isPlaceholder);
    console.log('getQuestions filters:', filters);

    if (isPlaceholder) {
      // Return filtered mock data for development
      console.log('Returning mock questions with filters:', filters);
      console.log('mockQuestions length:', mockQuestions.length);

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            console.log('Mock questions timeout started');
            let filteredQuestions = [...mockQuestions];

          // Apply filters
          if (filters.category_id) {
            filteredQuestions = filteredQuestions.filter(q => q.category_id === filters.category_id);
          }

          if (filters.status) {
            filteredQuestions = filteredQuestions.filter(q => q.status === filters.status);
          }

          if (filters.urgency_level) {
            filteredQuestions = filteredQuestions.filter(q => q.urgency_level === filters.urgency_level);
          }

          if (filters.has_expert_answer !== undefined) {
            filteredQuestions = filteredQuestions.filter(q => q.has_expert_answer === filters.has_expert_answer);
          }

          if (filters.has_ai_answer !== undefined) {
            filteredQuestions = filteredQuestions.filter(q => q.has_ai_answer === filters.has_ai_answer);
          }

          if (filters.featured !== undefined) {
            filteredQuestions = filteredQuestions.filter(q => q.featured === filters.featured);
          }

          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filteredQuestions = filteredQuestions.filter(q =>
              q.title.toLowerCase().includes(searchLower) ||
              q.content.toLowerCase().includes(searchLower) ||
              q.tags.some(tag => tag.toLowerCase().includes(searchLower))
            );
          }

          // Apply sorting
          switch (filters.sort_by) {
            case 'oldest':
              filteredQuestions.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              break;
            case 'most_votes':
              filteredQuestions.sort((a, b) => b.upvote_count - a.upvote_count);
              break;
            case 'most_answers':
              filteredQuestions.sort((a, b) => b.answer_count - a.answer_count);
              break;
            case 'most_views':
              filteredQuestions.sort((a, b) => b.view_count - a.view_count);
              break;
            case 'newest':
            default:
              filteredQuestions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              break;
          }

          // Apply pagination
          const page = filters.page || 1;
          const limit = filters.limit || 20;
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;

          const result = filteredQuestions.slice(startIndex, endIndex);
          console.log('Mock questions timeout resolved, returning:', result);
          console.log('Result length:', result.length);
          console.log('Result is array:', Array.isArray(result));
          resolve(result);
          } catch (error) {
            console.error('Error in mock questions timeout:', error);
            reject(error);
          }
        }, 50); // Further reduced timeout for testing
      });
    }

    let query = supabase
      .from('legal_questions')
      .select(`
        *,
        user:profiles(id, full_name, avatar_url),
        category:legal_qa_categories(id, name, color)
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
    if (isPlaceholder) {
      // Return mock data for development
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const question = mockQuestions.find(q => q.id === id);
          if (question) {
            // Increment view count
            question.view_count += 1;
            resolve(question);
          } else {
            reject(new Error('Question not found'));
          }
        }, 300);
      });
    }

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
    if (isPlaceholder) {
      // Return mock answers for development
      return new Promise((resolve) => {
        setTimeout(() => {
          const mockAnswers: LegalAnswer[] = [
            {
              id: '1',
              question_id: '1',
              user_id: 'expert1',
              content: `During probation periods in Singapore, employers do have more flexibility in termination, but there are still legal requirements to follow:

**Key Points:**
1. **Notice Period**: While the Employment Act allows for shorter notice during probation, most employment contracts specify the exact terms.
2. **Just Cause**: Employers should still have valid reasons for termination, even during probation.
3. **Documentation**: Proper documentation of performance issues is recommended.

**Your Rights:**
- Right to receive any outstanding salary and benefits
- Right to proper notice as per your contract
- Protection against discriminatory termination

**Recommendation**: Review your employment contract carefully for specific probation terms and consider consulting with MOM if you believe the termination was unfair.`,
              answer_type: 'expert',
              sources: ['Employment Act (Singapore)', 'Ministry of Manpower Guidelines'],
              disclaimer: null,
              is_accepted: true,
              expert_verified: true,
              upvote_count: 15,
              downvote_count: 1,
              helpful_count: 12,
              moderation_status: 'approved',
              created_at: '2024-01-15T11:30:00Z',
              updated_at: '2024-01-15T11:30:00Z',
              user: {
                id: 'expert1',
                full_name: 'Sarah Lim, Employment Lawyer',
                avatar_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150'
              }
            },
            {
              id: '2',
              question_id: '1',
              user_id: 'ai',
              content: `Based on Singapore employment law, here's what you should know about probation period terminations:

**Legal Framework:**
- The Employment Act provides the basic framework for employment relationships
- Probation periods are contractual arrangements between employer and employee
- Different rules may apply based on your employment contract

**During Probation:**
- Employers generally have more flexibility to terminate
- Notice periods may be shorter (often 1 day to 1 week)
- Performance standards may be more strictly applied

**Important Considerations:**
- Check your specific employment contract terms
- Ensure termination is not discriminatory
- You're entitled to outstanding wages and benefits

**Next Steps:**
- Review your employment contract
- Document any relevant communications
- Consider seeking legal advice if you believe the termination was unfair`,
              answer_type: 'ai',
              sources: ['Singapore Employment Act', 'MOM Employment Guidelines'],
              disclaimer: 'This AI-generated response is for informational purposes only and does not constitute legal advice.',
              is_accepted: false,
              expert_verified: false,
              upvote_count: 8,
              downvote_count: 0,
              helpful_count: 6,
              moderation_status: 'approved',
              created_at: '2024-01-15T12:00:00Z',
              updated_at: '2024-01-15T12:00:00Z',
              user: {
                id: 'ai',
                full_name: 'AI Assistant',
                avatar_url: undefined
              }
            }
          ];

          let filteredAnswers = mockAnswers;

          if (filters.question_id) {
            filteredAnswers = filteredAnswers.filter(a => a.question_id === filters.question_id);
          }

          if (filters.answer_type) {
            filteredAnswers = filteredAnswers.filter(a => a.answer_type === filters.answer_type);
          }

          if (filters.expert_verified !== undefined) {
            filteredAnswers = filteredAnswers.filter(a => a.expert_verified === filters.expert_verified);
          }

          if (filters.is_accepted !== undefined) {
            filteredAnswers = filteredAnswers.filter(a => a.is_accepted === filters.is_accepted);
          }

          // Apply sorting
          switch (filters.sort_by) {
            case 'oldest':
              filteredAnswers.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              break;
            case 'most_votes':
              filteredAnswers.sort((a, b) => b.upvote_count - a.upvote_count);
              break;
            case 'most_helpful':
              filteredAnswers.sort((a, b) => b.helpful_count - a.helpful_count);
              break;
            case 'newest':
            default:
              filteredAnswers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              break;
          }

          // Prioritize accepted answers
          filteredAnswers.sort((a, b) => (b.is_accepted ? 1 : 0) - (a.is_accepted ? 1 : 0));

          resolve(filteredAnswers);
        }, 300);
      });
    }

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
    if (isPlaceholder) {
      // Mock voting for development
      return new Promise((resolve) => {
        setTimeout(() => {
          const question = mockQuestions.find(q => q.id === questionId);
          if (question) {
            if (voteType === 'upvote') {
              question.upvote_count += 1;
            } else {
              question.downvote_count += 1;
            }
          }
          resolve();
        }, 200);
      });
    }

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
    if (isPlaceholder) {
      // Mock voting for development
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log(`Mock vote on answer ${answerId}: ${voteType}`);
          resolve();
        }, 200);
      });
    }

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
    if (isPlaceholder) {
      // Mock bookmarking for development
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log(`Mock bookmark question ${questionId}`);
          resolve();
        }, 200);
      });
    }

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
    if (isPlaceholder) {
      // Mock unbookmarking for development
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log(`Mock unbookmark question ${questionId}`);
          resolve();
        }, 200);
      });
    }

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

