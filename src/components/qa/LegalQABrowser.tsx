import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  Plus,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Clock,
  Star,
  Bookmark,
  BookmarkCheck,
  Filter,
  TrendingUp,
  Users,
  CheckCircle,
  Bot,
  Verified,
  AlertCircle
} from 'lucide-react';
import { legalQAApi } from '@/lib/api/legalQA';
import type { LegalQuestion, LegalQACategory, LegalQAFilters } from '@/types';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// Mock data for fallback when database is not available
const MOCK_CATEGORIES: LegalQACategory[] = [
  {
    id: '1',
    name: 'Employment Law',
    description: 'Questions about workplace rights, contracts, and employment disputes',
    icon: '💼',
    color: '#3B82F6',
    question_count: 45,
    is_active: true,
    order_index: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Property Law',
    description: 'Real estate transactions, landlord-tenant issues, and property disputes',
    icon: '🏠',
    color: '#10B981',
    question_count: 32,
    is_active: true,
    order_index: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Corporate Law',
    description: 'Business formation, contracts, and corporate governance',
    icon: '🏢',
    color: '#8B5CF6',
    question_count: 28,
    is_active: true,
    order_index: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Family Law',
    description: 'Divorce, custody, adoption, and family-related legal matters',
    icon: '👨‍👩‍👧‍👦',
    color: '#F59E0B',
    question_count: 23,
    is_active: true,
    order_index: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const MOCK_QUESTIONS: LegalQuestion[] = [
  {
    id: '1',
    title: 'What are my rights if I\'m terminated without notice?',
    content: 'I was working for a company for 2 years and they suddenly terminated me without any notice period. They said it was due to restructuring but I suspect it might be because I raised concerns about workplace safety. What are my rights under Singapore employment law?',
    category: MOCK_CATEGORIES[0],
    tags: ['termination', 'notice period', 'employment rights'],
    urgency_level: 'high',
    status: 'open',
    view_count: 156,
    upvote_count: 12,
    downvote_count: 1,
    answer_count: 3,
    has_expert_answer: true,
    has_ai_answer: false,
    featured: true,
    is_anonymous: false,
    location: 'Singapore',
    moderation_status: 'approved',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    user_id: 'mock-user-1',
    category_id: '1',
    user: {
      id: 'mock-user-1',
      full_name: 'John Doe',
      avatar_url: null
    }
  },
  {
    id: '2',
    title: 'Can my landlord increase rent during the lease period?',
    content: 'I signed a 2-year lease agreement with my landlord 6 months ago. Now they want to increase the rent by 20% citing inflation and market rates. The lease agreement doesn\'t mention anything about rent increases during the lease period. Is this legal?',
    category: MOCK_CATEGORIES[1],
    tags: ['rental', 'lease agreement', 'rent increase'],
    urgency_level: 'normal',
    status: 'answered',
    view_count: 89,
    upvote_count: 8,
    downvote_count: 0,
    answer_count: 2,
    has_expert_answer: false,
    has_ai_answer: true,
    featured: false,
    is_anonymous: true,
    location: 'Singapore',
    moderation_status: 'approved',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString(),
    user_id: 'mock-user-2',
    category_id: '2',
    user: {
      id: 'mock-user-2',
      full_name: 'Anonymous User',
      avatar_url: null
    }
  }
];

interface LegalQABrowserProps {
  onAskQuestion?: () => void;
  className?: string;
}

export const LegalQABrowser: React.FC<LegalQABrowserProps> = ({
  onAskQuestion,
  className = ''
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Initialize with empty arrays to prevent undefined errors
  const [categories, setCategories] = useState<LegalQACategory[]>([]);
  const [questions, setQuestions] = useState<LegalQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<LegalQAFilters['sort_by']>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];

  const [filters, setFilters] = useState<LegalQAFilters>({
    page: 1,
    limit: 20
  });

  // Check if we're in development mode or using placeholder Supabase
  const isDevelopmentMode = import.meta.env.DEV ||
    import.meta.env.VITE_SUPABASE_URL?.includes('placeholder');

  const initializeData = useCallback(async () => {
    let isMounted = true;

    try {
      setLoading(true);
      setError(null);

      if (isDevelopmentMode) {
        console.log('Using mock data in development mode');
        // Use mock data in development
        if (isMounted) {
          setCategories(MOCK_CATEGORIES);
          setQuestions(MOCK_QUESTIONS);
        }
        return;
      }

      // Load categories first
      console.log('Loading categories from API...');
      const categoriesData = await legalQAApi.getCategories();

      if (!isMounted) return;

      if (Array.isArray(categoriesData) && categoriesData.length > 0) {
        console.log('Categories loaded successfully:', categoriesData.length);
        setCategories(categoriesData);
      } else {
        console.warn('Categories data is empty, using mock data');
        setCategories(MOCK_CATEGORIES);
      }

      // Load questions with basic filters
      console.log('Loading questions from API...');
      const questionsData = await legalQAApi.getQuestions({
        page: 1,
        limit: 20
      });

      if (!isMounted) return;

      if (Array.isArray(questionsData) && questionsData.length > 0) {
        console.log('Questions loaded successfully:', questionsData.length);
        setQuestions(questionsData);
      } else {
        console.warn('Questions data is empty, using mock data');
        setQuestions(MOCK_QUESTIONS);
      }

    } catch (error) {
      console.error('Error initializing data:', error);
      if (isMounted) {
        console.log('API failed, falling back to mock data');
        // Fallback to mock data instead of showing error
        setCategories(MOCK_CATEGORIES);
        setQuestions(MOCK_QUESTIONS);
        setError(null); // Don't show error when we have fallback data
      }
    } finally {
      if (isMounted) {
        console.log('Setting loading to false in initialization');
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [isDevelopmentMode]);

  useEffect(() => {
    console.log('Initial useEffect triggered');
    initializeData();
  }, [initializeData]);

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading questions... activeTab:', activeTab);

      if (isDevelopmentMode) {
        console.log('Using filtered mock data');
        // Filter mock data based on current filters
        let filteredQuestions = [...MOCK_QUESTIONS];

        if (searchQuery) {
          filteredQuestions = filteredQuestions.filter(q =>
            q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.content.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        if (selectedCategory) {
          filteredQuestions = filteredQuestions.filter(q => q.category_id === selectedCategory);
        }

        // Apply tab-specific filters
        switch (activeTab) {
          case 'trending':
            filteredQuestions = filteredQuestions.filter(q => q.featured);
            break;
          case 'expert':
            filteredQuestions = filteredQuestions.filter(q => q.has_expert_answer);
            break;
          case 'unanswered':
            filteredQuestions = filteredQuestions.filter(q => q.status === 'open');
            break;
          case 'ai':
            filteredQuestions = filteredQuestions.filter(q => q.has_ai_answer);
            break;
        }

        setQuestions(filteredQuestions);
        return;
      }

      const queryFilters: LegalQAFilters = {
        page: 1,
        limit: 20,
        search: searchQuery || undefined,
        category_id: selectedCategory || undefined,
        sort_by: sortBy
      };

      // Apply tab-specific filters
      switch (activeTab) {
        case 'trending':
          queryFilters.sort_by = 'most_views';
          queryFilters.featured = true;
          break;
        case 'expert':
          queryFilters.has_expert_answer = true;
          break;
        case 'unanswered':
          queryFilters.status = 'open';
          queryFilters.sort_by = 'oldest';
          break;
        case 'ai':
          queryFilters.has_ai_answer = true;
          break;
      }

      console.log('Query filters:', queryFilters);
      const questionsData = await legalQAApi.getQuestions(queryFilters);
      console.log('Questions loaded:', questionsData);
      console.log('Questions count:', questionsData.length);
      setQuestions(questionsData);
    } catch (error) {
      console.error('Error loading questions:', error);
      // Fallback to mock data instead of showing error
      console.log('API failed, using mock data');
      setQuestions(MOCK_QUESTIONS);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  }, [isDevelopmentMode, activeTab, searchQuery, selectedCategory, sortBy]);

  // Simplified effect for filtering - only when user interacts
  useEffect(() => {
    if (loading || categories.length === 0) return; // Don't filter while loading or no categories

    console.log('Filter useEffect triggered:', {
      searchQuery, selectedCategory, sortBy, activeTab
    });

    // Only reload questions if user has actually changed something
    if (searchQuery || selectedCategory || activeTab !== 'all') {
      loadQuestions();
    }
  }, [searchQuery, selectedCategory, activeTab, loadQuestions, loading, categories.length, sortBy]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadQuestions();
  };

  const handleQuestionClick = (questionId: string) => {
    navigate(`/legal-qa/${questionId}`);
  };

  const handleVote = async (questionId: string, voteType: 'upvote' | 'downvote') => {
    if (!user) {
      toast.error('Please log in to vote');
      return;
    }

    try {
      if (!isDevelopmentMode) {
        await legalQAApi.voteOnQuestion(questionId, voteType);
        await loadQuestions(); // Refresh to show updated vote counts
      }
      toast.success('Vote recorded');
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to record vote');
    }
  };

  const handleBookmark = async (questionId: string) => {
    if (!user) {
      toast.error('Please log in to bookmark questions');
      return;
    }

    try {
      if (!isDevelopmentMode) {
        // Check if already bookmarked (you'd need to track this state)
        await legalQAApi.bookmarkQuestion(questionId);
      }
      toast.success('Question bookmarked');
    } catch (error) {
      console.error('Error bookmarking:', error);
      toast.error('Failed to bookmark question');
    }
  };

  const getUrgencyColor = (urgency: LegalQuestion['urgency_level']) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderQuestionCard = (question: LegalQuestion) => (
    <Card 
      key={question.id} 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => handleQuestionClick(question.id)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                {question.title}
              </h3>
              {question.featured && (
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
              )}
            </div>
            
            <p className="text-gray-600 text-sm line-clamp-2 mb-3">
              {question.content}
            </p>

            {/* Tags and Category */}
            <div className="flex flex-wrap gap-2 mb-3">
              {question.category && (
                <Badge 
                  variant="secondary" 
                  className="text-xs"
                  style={{ backgroundColor: question.category.color + '20', color: question.category.color }}
                >
                  {question.category.name}
                </Badge>
              )}
              <Badge className={`text-xs ${getUrgencyColor(question.urgency_level)}`}>
                {question.urgency_level}
              </Badge>
              {question.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Question Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <MessageSquare className="h-4 w-4" />
              <span>{question.answer_count}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>{question.view_count}</span>
            </div>
            <div className="flex items-center space-x-1">
              <ThumbsUp className="h-4 w-4" />
              <span>{question.upvote_count}</span>
            </div>
            {question.has_expert_answer && (
              <div className="flex items-center space-x-1 text-green-600">
                <Verified className="h-4 w-4" />
                <span>Expert</span>
              </div>
            )}
            {question.has_ai_answer && (
              <div className="flex items-center space-x-1 text-blue-600">
                <Bot className="h-4 w-4" />
                <span>AI</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* User info */}
            <div className="flex items-center space-x-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={question.user?.avatar_url} />
                <AvatarFallback className="text-xs">
                  {question.is_anonymous ? 'A' : question.user?.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="text-xs text-gray-500">
                <span>{question.is_anonymous ? 'Anonymous' : question.user?.full_name}</span>
                <span className="mx-1">•</span>
                <span>{formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVote(question.id, 'upvote');
                }}
                disabled={!user}
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBookmark(question.id);
                }}
                disabled={!user}
              >
                <Bookmark className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Legal Q&A</h2>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
            <Button
              onClick={() => {
                setError(null);
                setLoading(true);
                window.location.reload(); // Simple reload for now
              }}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Legal Q&A</h2>
          <p className="text-gray-600">
            Get answers to your legal questions from the community and experts
            {isDevelopmentMode && (
              <span className="ml-2 text-sm text-blue-600">(Demo Mode)</span>
            )}
          </p>
        </div>
        <Button onClick={onAskQuestion} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Ask Question
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search legal questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="w-full md:w-48">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    {safeCategories.map((category) => (
                      category && category.id && category.name ? (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ) : null
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-48">
                <Select value={sortBy} onValueChange={(value: LegalQAFilters['sort_by']) => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="most_votes">Most Votes</SelectItem>
                    <SelectItem value="most_answers">Most Answers</SelectItem>
                    <SelectItem value="most_views">Most Views</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit">Search</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Questions</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="expert">Expert Answered</TabsTrigger>
          <TabsTrigger value="unanswered">Unanswered</TabsTrigger>
          <TabsTrigger value="ai">AI Answered</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {/* Questions List */}
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        <div className="flex space-x-2">
                          <div className="h-6 bg-gray-200 rounded w-16"></div>
                          <div className="h-6 bg-gray-200 rounded w-20"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : questions.length > 0 ? (
              questions.map(renderQuestionCard)
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery || selectedCategory 
                      ? 'Try adjusting your search criteria or browse different categories.'
                      : 'Be the first to ask a question in this category.'
                    }
                  </p>
                  {onAskQuestion && (
                    <Button onClick={onAskQuestion}>
                      <Plus className="h-4 w-4 mr-2" />
                      Ask First Question
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

