import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Eye,
  Bookmark,
  BookmarkCheck,
  Star,
  CheckCircle,
  Bot,
  Verified,
  Flag,
  Share2,
  Clock,
  User,
  Award,
  Send
} from 'lucide-react';
import { legalQAApi } from '@/lib/api/legalQA';
import type { LegalQuestion, LegalAnswer } from '@/types';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface QuestionDetailProps {
  questionId?: string;
}

export const QuestionDetail: React.FC<QuestionDetailProps> = ({ questionId }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const detailId = questionId || id;
  
  const [question, setQuestion] = useState<LegalQuestion | null>(null);
  const [answers, setAnswers] = useState<LegalAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [newAnswer, setNewAnswer] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    if (detailId) {
      loadQuestionDetail();
      loadAnswers();
    }
  }, [detailId]);

  const loadQuestionDetail = async () => {
    if (!detailId) return;

    try {
      setLoading(true);
      const questionData = await legalQAApi.getQuestion(detailId);
      setQuestion(questionData);
    } catch (error: any) {
      console.error('Error loading question:', error);
      toast.error('Failed to load question');
      navigate('/legal-qa');
    } finally {
      setLoading(false);
    }
  };

  const loadAnswers = async () => {
    if (!detailId) return;

    try {
      setAnswersLoading(true);
      const answersData = await legalQAApi.getAnswers({ question_id: detailId });
      setAnswers(answersData);
    } catch (error: any) {
      console.error('Error loading answers:', error);
      toast.error('Failed to load answers');
    } finally {
      setAnswersLoading(false);
    }
  };

  const handleVoteQuestion = async (voteType: 'upvote' | 'downvote') => {
    if (!user || !question) {
      toast.error('Please log in to vote');
      return;
    }

    try {
      await legalQAApi.voteOnQuestion(question.id, voteType);
      await loadQuestionDetail(); // Refresh to show updated vote counts
      toast.success('Vote recorded');
    } catch (error: any) {
      console.error('Error voting:', error);
      toast.error('Failed to record vote');
    }
  };

  const handleVoteAnswer = async (answerId: string, voteType: 'upvote' | 'downvote' | 'helpful') => {
    if (!user) {
      toast.error('Please log in to vote');
      return;
    }

    try {
      await legalQAApi.voteOnAnswer(answerId, voteType);
      await loadAnswers(); // Refresh to show updated vote counts
      toast.success('Vote recorded');
    } catch (error: any) {
      console.error('Error voting:', error);
      toast.error('Failed to record vote');
    }
  };

  const handleBookmark = async () => {
    if (!user || !question) {
      toast.error('Please log in to bookmark questions');
      return;
    }

    try {
      if (isBookmarked) {
        await legalQAApi.unbookmarkQuestion(question.id);
        setIsBookmarked(false);
        toast.success('Bookmark removed');
      } else {
        await legalQAApi.bookmarkQuestion(question.id);
        setIsBookmarked(true);
        toast.success('Question bookmarked');
      }
    } catch (error: any) {
      console.error('Error bookmarking:', error);
      toast.error('Failed to update bookmark');
    }
  };

  const handleSubmitAnswer = async () => {
    if (!user || !question || !newAnswer.trim()) {
      toast.error('Please log in and provide an answer');
      return;
    }

    try {
      setSubmittingAnswer(true);
      
      await legalQAApi.createAnswer({
        question_id: question.id,
        user_id: user.id,
        content: newAnswer.trim(),
        answer_type: 'community',
        is_accepted: false
      });

      setNewAnswer('');
      await loadAnswers(); // Refresh answers
      toast.success('Answer submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      toast.error('Failed to submit answer');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const generateAIAnswer = async () => {
    if (!question) return;

    try {
      toast.info('Generating AI answer...');
      
      await legalQAApi.generateAIAnswer({
        question_id: question.id,
        question_title: question.title,
        question_content: question.content,
        category: question.category?.name,
        tags: question.tags,
        location: question.location
      });

      await loadAnswers(); // Refresh to show AI answer
      toast.success('AI answer generated successfully!');
    } catch (error: any) {
      console.error('Error generating AI answer:', error);
      toast.error('Failed to generate AI answer');
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

  const getAnswerTypeIcon = (answerType: LegalAnswer['answer_type']) => {
    switch (answerType) {
      case 'expert':
      case 'verified':
        return <Verified className="h-4 w-4 text-green-600" />;
      case 'ai':
        return <Bot className="h-4 w-4 text-blue-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading question...</p>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Question Not Found</h2>
          <p className="text-gray-600 mb-4">The question you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/legal-qa')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Q&A
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/legal-qa')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Q&A
          </Button>
        </div>

        {/* Question */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-3">{question.title}</CardTitle>
                
                {/* Question metadata */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {question.category && (
                    <Badge 
                      variant="secondary"
                      style={{ backgroundColor: question.category.color + '20', color: question.category.color }}
                    >
                      {question.category.name}
                    </Badge>
                  )}
                  <Badge className={getUrgencyColor(question.urgency_level)}>
                    {question.urgency_level}
                  </Badge>
                  {question.featured && (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Featured
                    </Badge>
                  )}
                  {question.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Question stats */}
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{question.view_count} views</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>{question.answer_count} answers</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Asked {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
                  </div>
                  {question.location && (
                    <div className="flex items-center space-x-1">
                      <span>📍 {question.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVoteQuestion('upvote')}
                  disabled={!user}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  {question.upvote_count}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBookmark}
                  disabled={!user}
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="h-4 w-4" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="prose max-w-none mb-6">
              <p className="text-gray-700 whitespace-pre-wrap">{question.content}</p>
            </div>

            {/* Question author */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={question.user?.avatar_url} />
                  <AvatarFallback>
                    {question.is_anonymous ? 'A' : question.user?.full_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900">
                    {question.is_anonymous ? 'Anonymous' : question.user?.full_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Asked {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {!question.has_ai_answer && (
                <Button
                  variant="outline"
                  onClick={generateAIAnswer}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Get AI Answer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Answers Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {question.answer_count} Answer{question.answer_count !== 1 ? 's' : ''}
            </h2>
          </div>

          {/* Answers List */}
          {answersLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : answers.length > 0 ? (
            answers.map((answer) => (
              <Card key={answer.id} className={answer.is_accepted ? 'border-green-500 bg-green-50' : ''}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {getAnswerTypeIcon(answer.answer_type)}
                      <span className="text-sm font-medium capitalize text-gray-700">
                        {answer.answer_type} Answer
                      </span>
                      {answer.is_accepted && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Accepted
                        </Badge>
                      )}
                      {answer.expert_verified && (
                        <Badge className="bg-blue-100 text-blue-800">
                          <Award className="h-3 w-3 mr-1" />
                          Expert Verified
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="prose max-w-none mb-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{answer.content}</p>
                  </div>

                  {/* Answer disclaimer for AI answers */}
                  {answer.answer_type === 'ai' && answer.disclaimer && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <p className="text-xs text-yellow-800">{answer.disclaimer}</p>
                    </div>
                  )}

                  {/* Answer sources */}
                  {answer.sources && answer.sources.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Sources:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {answer.sources.map((source, index) => (
                          <li key={index}>• {source}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Answer actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVoteAnswer(answer.id, 'upvote')}
                        disabled={!user}
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        {answer.upvote_count}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVoteAnswer(answer.id, 'helpful')}
                        disabled={!user}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        {answer.helpful_count} Helpful
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Comment
                      </Button>
                    </div>

                    {/* Answer author */}
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={answer.user?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {answer.answer_type === 'ai' ? 'AI' : answer.user?.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-xs text-gray-500">
                        <span>
                          {answer.answer_type === 'ai' ? 'AI Assistant' : answer.user?.full_name}
                        </span>
                        <span className="mx-1">•</span>
                        <span>{formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No answers yet</h3>
                <p className="text-gray-500">Be the first to answer this question!</p>
              </CardContent>
            </Card>
          )}

          {/* Answer Form */}
          {user && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Answer</CardTitle>
                <CardDescription>
                  Share your knowledge and help the community
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    placeholder="Provide a helpful answer to this legal question..."
                    rows={6}
                    maxLength={5000}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {newAnswer.length}/5000 characters
                    </p>
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={!newAnswer.trim() || submittingAnswer}
                    >
                      {submittingAnswer ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Answer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
