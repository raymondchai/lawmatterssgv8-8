import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Star, 
  MessageSquare, 
  Send,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { lawFirmsApi, type CreateReviewData } from '@/lib/api/lawFirms';
import type { LawFirm } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5, 'Rating must be between 1 and 5'),
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title must be less than 100 characters'),
  content: z.string().min(20, 'Review must be at least 20 characters').max(1000, 'Review must be less than 1000 characters')
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  lawFirm: LawFirm;
  onReviewSubmitted?: () => void;
  onCancel?: () => void;
  className?: string;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  lawFirm,
  onReviewSubmitted,
  onCancel,
  className = ''
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
  });

  const watchedContent = watch('content', '');

  const onSubmit = async (data: ReviewFormData) => {
    if (!user) {
      toast.error('Please log in to submit a review');
      return;
    }

    setIsSubmitting(true);

    try {
      const reviewData: CreateReviewData = {
        law_firm_id: lawFirm.id,
        rating: data.rating,
        title: data.title,
        content: data.content
      };

      await lawFirmsApi.createReview(reviewData);
      
      toast.success('Review submitted successfully! It will be published after moderation.');
      onReviewSubmitted?.();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingClick = (rating: number) => {
    setSelectedRating(rating);
    setValue('rating', rating);
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, i) => {
      const starValue = i + 1;
      const isActive = starValue <= (hoverRating || selectedRating);
      
      return (
        <button
          key={i}
          type="button"
          className={`p-1 transition-colors ${isActive ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
          onMouseEnter={() => setHoverRating(starValue)}
          onMouseLeave={() => setHoverRating(0)}
          onClick={() => handleRatingClick(starValue)}
        >
          <Star className={`h-8 w-8 ${isActive ? 'fill-current' : ''}`} />
        </button>
      );
    });
  };

  const getRatingLabel = (rating: number) => {
    const labels = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent'
    };
    return labels[rating as keyof typeof labels] || '';
  };

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sign in to write a review
          </h3>
          <p className="text-gray-500 mb-4">
            You need to be logged in to submit a review for this law firm.
          </p>
          <Button onClick={() => window.location.href = '/login'}>
            Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5" />
          <span>Write a Review for {lawFirm.name}</span>
        </CardTitle>
        <CardDescription>
          Share your experience to help others make informed decisions
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Rating */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Overall Rating *</Label>
            <div className="flex items-center space-x-2">
              <div className="flex">
                {renderStars()}
              </div>
              {selectedRating > 0 && (
                <span className="text-lg font-medium text-gray-700">
                  {getRatingLabel(selectedRating)}
                </span>
              )}
            </div>
            {errors.rating && (
              <p className="text-red-500 text-sm">{errors.rating.message}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-medium">
              Review Title *
            </Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Summarize your experience in a few words"
              className="w-full"
            />
            {errors.title && (
              <p className="text-red-500 text-sm">{errors.title.message}</p>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-base font-medium">
              Your Review *
            </Label>
            <Textarea
              id="content"
              {...register('content')}
              placeholder="Tell others about your experience with this law firm. What services did you use? How was the communication? Would you recommend them?"
              rows={6}
              className="w-full resize-none"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>
                {errors.content ? (
                  <span className="text-red-500">{errors.content.message}</span>
                ) : (
                  'Minimum 20 characters'
                )}
              </span>
              <span>{watchedContent.length}/1000</span>
            </div>
          </div>

          {/* Guidelines */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Review Guidelines:</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Be honest and constructive in your feedback</li>
                <li>Focus on your personal experience with the law firm</li>
                <li>Avoid sharing confidential or sensitive information</li>
                <li>Reviews are moderated and may take time to appear</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex space-x-3">
            <Button
              type="submit"
              disabled={isSubmitting || selectedRating === 0}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Review
                </>
              )}
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
          </div>

          {/* Success Message */}
          {selectedRating > 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Your {selectedRating}-star review will help other users make informed decisions about {lawFirm.name}.
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
