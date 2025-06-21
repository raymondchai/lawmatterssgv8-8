import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, ThumbsUp, MessageSquare, Plus } from 'lucide-react';
import { lawFirmsApi } from '@/lib/api/lawFirms';
import type { LawFirmReview } from '@/types';
import { toast } from '@/components/ui/sonner';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface LawFirmReviewsProps {
  lawFirmId: string;
  reviews: LawFirmReview[];
}

export const LawFirmReviews: React.FC<LawFirmReviewsProps> = ({
  lawFirmId,
  reviews: initialReviews
}) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<LawFirmReview[]>(initialReviews);
  const [loading, setLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++;
    });
    return distribution;
  };

  const handleHelpfulVote = async (reviewId: string, isHelpful: boolean) => {
    if (!user) {
      toast.error('Please log in to vote on reviews');
      return;
    }

    try {
      await lawFirmsApi.voteOnReview(reviewId, isHelpful);
      // Refresh reviews to show updated helpful count
      const updatedReviews = await lawFirmsApi.getLawFirmReviews(lawFirmId);
      setReviews(updatedReviews);
      toast.success('Thank you for your feedback!');
    } catch (error: any) {
      console.error('Error voting on review:', error);
      toast.error('Failed to submit vote');
    }
  };

  const loadAllReviews = async () => {
    try {
      setLoading(true);
      const allReviews = await lawFirmsApi.getLawFirmReviews(lawFirmId);
      setReviews(allReviews);
    } catch (error: any) {
      console.error('Error loading reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setReviews(initialReviews);
  }, [initialReviews]);

  const ratingDistribution = getRatingDistribution();
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
    : 0;

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Client Reviews</CardTitle>
          {user && (
            <Button onClick={() => setShowReviewForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Write Review
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Rating */}
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {averageRating.toFixed(1)}
              </div>
              <div className="flex items-center justify-center space-x-1 mb-2">
                {renderStars(averageRating)}
              </div>
              <p className="text-gray-600">
                Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(rating => {
                const count = ratingDistribution[rating as keyof typeof ratingDistribution];
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                
                return (
                  <div key={rating} className="flex items-center space-x-2">
                    <span className="text-sm w-8">{rating}</span>
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-400 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Reviews */}
      <div className="space-y-4">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Avatar>
                    <AvatarFallback>
                      {review.user ? getInitials(review.user.full_name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {review.user?.full_name || 'Anonymous'}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            {renderStars(review.rating)}
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                          </span>
                          {review.verified_client && (
                            <Badge variant="outline" className="text-xs">
                              Verified Client
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <h5 className="font-medium text-gray-900 mb-2">{review.title}</h5>
                    <p className="text-gray-700 mb-3">{review.content}</p>
                    
                    <div className="flex items-center space-x-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-gray-500"
                        onClick={() => handleHelpfulVote(review.id, true)}
                        disabled={!user}
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Helpful ({review.helpful_count})
                      </Button>
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
              <p className="text-gray-500 mb-4">
                Be the first to review this law firm.
              </p>
              {user && (
                <Button onClick={() => setShowReviewForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Write First Review
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Load More Reviews */}
      {reviews.length > 0 && reviews.length >= 5 && (
        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={loadAllReviews}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load All Reviews'}
          </Button>
        </div>
      )}

      {/* Review Form Modal - Placeholder */}
      {showReviewForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Write a Review</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Review form will be implemented in the next phase.
              </p>
              <Button 
                onClick={() => setShowReviewForm(false)}
                className="w-full"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
