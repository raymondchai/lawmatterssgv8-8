import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { templateMarketplaceService, type Template } from '@/lib/services/templateMarketplace';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';
import { 
  Star, 
  MessageSquare, 
  ThumbsUp, 
  Flag, 
  User,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TemplateRating {
  id: string;
  templateId: string;
  userId: string;
  rating: number;
  review?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}

interface TemplateRatingProps {
  template: Template;
  className?: string;
}

export const TemplateRating: React.FC<TemplateRatingProps> = ({
  template,
  className = ''
}) => {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<TemplateRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [userRating, setUserRating] = useState<TemplateRating | null>(null);
  
  // Rating form state
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  useEffect(() => {
    loadRatings();
  }, [template.id]);

  const loadRatings = async () => {
    try {
      setLoading(true);

      // Load template ratings
      const ratingsData = await templateMarketplaceService.getTemplateRatings(template.id);

      // Transform the data to match our interface
      const transformedRatings: TemplateRating[] = ratingsData.map(rating => ({
        id: rating.id,
        templateId: rating.template_id,
        userId: rating.user_id,
        rating: rating.rating,
        review: rating.review,
        isVerified: rating.is_verified,
        createdAt: new Date(rating.created_at),
        updatedAt: new Date(rating.updated_at),
        user: rating.user ? {
          id: rating.user.id,
          email: rating.user.email,
          firstName: rating.user.first_name,
          lastName: rating.user.last_name,
          avatar: rating.user.avatar_url
        } : undefined
      }));

      setRatings(transformedRatings);

      // Check if current user has already rated
      if (user) {
        try {
          const existingRating = await templateMarketplaceService.getUserTemplateRating(template.id, user.id);
          if (existingRating) {
            const userRatingData: TemplateRating = {
              id: existingRating.id,
              templateId: existingRating.template_id,
              userId: existingRating.user_id,
              rating: existingRating.rating,
              review: existingRating.review,
              isVerified: existingRating.is_verified,
              createdAt: new Date(existingRating.created_at),
              updatedAt: new Date(existingRating.updated_at)
            };
            setUserRating(userRatingData);
            setSelectedRating(userRatingData.rating);
            setReviewText(userRatingData.review || '');
          }
        } catch (error) {
          // User hasn't rated yet, which is fine
          console.log('User has not rated this template yet');
        }
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
      toast.error('Failed to load ratings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!user) {
      toast.error('Please log in to rate this template');
      return;
    }

    if (selectedRating === 0) {
      toast.error('Please select a rating');
      return;
    }

    try {
      setSubmitting(true);
      
      await templateMarketplaceService.rateTemplate(
        template.id,
        user.id,
        selectedRating,
        reviewText.trim() || undefined
      );

      toast.success('Rating submitted successfully!');
      setShowRatingForm(false);
      loadRatings(); // Reload ratings
      
      // Track rating event
      await templateMarketplaceService.trackEvent(template.id, 'template_rated', {
        rating: selectedRating,
        has_review: !!reviewText.trim()
      });
      
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false, size = 'h-4 w-4') => {
    return Array.from({ length: 5 }, (_, i) => {
      const starValue = i + 1;
      const isActive = starValue <= (interactive ? (hoverRating || selectedRating) : rating);
      
      return (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          className={`${interactive ? 'cursor-pointer' : 'cursor-default'} transition-colors ${
            isActive ? 'text-yellow-400' : 'text-gray-300'
          } ${interactive ? 'hover:text-yellow-300' : ''}`}
          onMouseEnter={() => interactive && setHoverRating(starValue)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          onClick={() => interactive && setSelectedRating(starValue)}
        >
          <Star className={`${size} ${isActive ? 'fill-current' : ''}`} />
        </button>
      );
    });
  };

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratings.forEach(rating => {
      distribution[rating.rating as keyof typeof distribution]++;
    });
    return distribution;
  };

  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const distribution = getRatingDistribution();
  const totalRatings = ratings.length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Rating Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-400" />
              Ratings & Reviews
            </CardTitle>
            {user && !userRating && (
              <Dialog open={showRatingForm} onOpenChange={setShowRatingForm}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Write Review
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Rate this Template</DialogTitle>
                    <DialogDescription>
                      Share your experience with this template to help other users
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Rating</label>
                      <div className="flex items-center gap-1">
                        {renderStars(selectedRating, true, 'h-8 w-8')}
                      </div>
                      {selectedRating > 0 && (
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedRating === 1 && 'Poor'}
                          {selectedRating === 2 && 'Fair'}
                          {selectedRating === 3 && 'Good'}
                          {selectedRating === 4 && 'Very Good'}
                          {selectedRating === 5 && 'Excellent'}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Review (Optional)
                      </label>
                      <Textarea
                        placeholder="Share your thoughts about this template..."
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        rows={4}
                        maxLength={500}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {reviewText.length}/500 characters
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSubmitRating}
                        disabled={submitting || selectedRating === 0}
                        className="flex-1"
                      >
                        {submitting ? 'Submitting...' : 'Submit Rating'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowRatingForm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Overall Rating */}
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {template.ratingAverage.toFixed(1)}
              </div>
              <div className="flex items-center justify-center gap-1 mb-2">
                {renderStars(template.ratingAverage)}
              </div>
              <p className="text-gray-600">
                Based on {template.ratingCount} review{template.ratingCount !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-8">{star}</span>
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{ 
                        width: totalRatings > 0 ? `${(distribution[star as keyof typeof distribution] / totalRatings) * 100}%` : '0%' 
                      }}
                    />
                  </div>
                  <span className="w-8 text-gray-600">
                    {distribution[star as keyof typeof distribution]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {userRating && (
            <Alert className="mt-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                You rated this template {userRating.rating} star{userRating.rating !== 1 ? 's' : ''}.
                {userRating.review && ' Thank you for your review!'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Individual Reviews */}
      {ratings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {ratings.map((rating, index) => (
                <div key={rating.id}>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={rating.user?.avatar} />
                      <AvatarFallback>
                        {getInitials(rating.user?.firstName, rating.user?.lastName, rating.user?.email)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">
                          {rating.user?.firstName && rating.user?.lastName 
                            ? `${rating.user.firstName} ${rating.user.lastName}`
                            : rating.user?.email?.split('@')[0] || 'Anonymous'
                          }
                        </span>
                        {rating.isVerified && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(rating.createdAt, { addSuffix: true })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 mb-2">
                        {renderStars(rating.rating)}
                      </div>
                      
                      {rating.review && (
                        <p className="text-gray-700 leading-relaxed">
                          {rating.review}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {index < ratings.length - 1 && <Separator className="mt-6" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && ratings.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
            <p className="text-gray-600 mb-4">
              Be the first to review this template and help other users!
            </p>
            {user && (
              <Button onClick={() => setShowRatingForm(true)}>
                Write the First Review
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
