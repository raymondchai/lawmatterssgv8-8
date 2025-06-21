import React, { useState, useEffect } from 'react';
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
  Verified
} from 'lucide-react';
import { legalQAApi } from '@/lib/api/legalQA';
import type { LegalQuestion, LegalQACategory, LegalQAFilters } from '@/types';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

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
  
  const [questions, setQuestions] = useState<LegalQuestion[]>([]);
  const [categories, setCategories] = useState<LegalQACategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<LegalQAFilters['sort_by']>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const [filters, setFilters] = useState<LegalQAFilters>({
    page: 1,
    limit: 20
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [filters, searchQuery, selectedCategory, sortBy, activeTab]);

  const loadInitialData = async () => {
    try {
      const categoriesData = await legalQAApi.getCategories();
      setCategories(categoriesData);
    } catch (error: any) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load Q&A data');
    }
  };

  const loadQuestions = async () => {
    try {
      setLoading(true);
      
      const queryFilters: LegalQAFilters = {
        ...filters,
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

      const questionsData = await legalQAApi.getQuestions(queryFilters);
      setQuestions(questionsData);
    } catch (error: any) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

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
      await legalQAApi.voteOnQuestion(questionId, voteType);
      await loadQuestions(); // Refresh to show updated vote counts
      toast.success('Vote recorded');
    } catch (error: any) {
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
      // Check if already bookmarked (you'd need to track this state)
      await legalQAApi.bookmarkQuestion(questionId);
      toast.success('Question bookmarked');
    } catch (error: any) {
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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Legal Q&A</h2>
          <p className="text-gray-600">
            Get answers to your legal questions from the community and experts
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
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-48">
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
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
