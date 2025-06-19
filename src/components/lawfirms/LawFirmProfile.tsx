import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Star, 
  Verified,
  Users,
  Calendar,
  MessageSquare,
  ThumbsUp,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';
import { lawFirmsApi } from '@/lib/api/lawFirms';
import type { LawFirm, LawFirmReview } from '@/types';
import { toast } from '@/components/ui/sonner';
import { formatDistanceToNow } from 'date-fns';

interface LawFirmProfileProps {
  firmId: string;
  onBack?: () => void;
  className?: string;
}

export const LawFirmProfile: React.FC<LawFirmProfileProps> = ({
  firmId,
  onBack,
  className = ''
}) => {
  const [firm, setFirm] = useState<LawFirm | null>(null);
  const [reviews, setReviews] = useState<LawFirmReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadFirmData();
  }, [firmId]);

  const loadFirmData = async () => {
    try {
      setLoading(true);
      setReviewsLoading(true);
      
      const [firmData, reviewsData] = await Promise.all([
        lawFirmsApi.getLawFirm(firmId),
        lawFirmsApi.getLawFirmReviews(firmId)
      ]);
      
      setFirm(firmData);
      setReviews(reviewsData);
    } catch (error: any) {
      console.error('Error loading firm data:', error);
      toast.error('Failed to load law firm information');
    } finally {
      setLoading(false);
      setReviewsLoading(false);
    }
  };

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

  if (loading || !firm) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const ratingDistribution = getRatingDistribution();
  const totalReviews = reviews.length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-4">
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-gray-900">{firm.name}</h1>
            {firm.verified && (
              <Verified className="h-6 w-6 text-blue-500" />
            )}
          </div>
          <div className="flex items-center space-x-4 mt-2">
            <div className="flex items-center space-x-1">
              {renderStars(firm.rating)}
              <span className="text-lg font-medium text-gray-900 ml-2">
                {firm.rating.toFixed(1)}
              </span>
              <span className="text-gray-500">
                ({totalReviews} review{totalReviews !== 1 ? 's' : ''})
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({totalReviews})</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* About */}
              <Card>
                <CardHeader>
                  <CardTitle>About {firm.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{firm.description}</p>
                </CardContent>
              </Card>

              {/* Practice Areas */}
              <Card>
                <CardHeader>
                  <CardTitle>Practice Areas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {firm.practice_areas.map((area, index) => (
                      <Badge key={index} variant="secondary" className="text-sm">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="space-y-6">
              {/* Rating Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Client Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Overall Rating */}
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-900 mb-2">
                        {firm.rating.toFixed(1)}
                      </div>
                      <div className="flex items-center justify-center space-x-1 mb-2">
                        {renderStars(firm.rating)}
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
                {reviewsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                              <div className="h-3 bg-gray-200 rounded w-full"></div>
                              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : reviews.length > 0 ? (
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
                              <Button variant="ghost" size="sm" className="text-gray-500">
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
                      <p className="text-gray-500">
                        Be the first to review this law firm.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-gray-600">{firm.address}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">Phone</p>
                      <p className="text-gray-600">{firm.phone}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-gray-600">{firm.email}</p>
                    </div>
                  </div>
                  
                  {firm.website && (
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Website</p>
                        <a 
                          href={firm.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                        >
                          <span>{firm.website}</span>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Rating</span>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="font-medium">{firm.rating.toFixed(1)}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Reviews</span>
                <span className="font-medium">{totalReviews}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Practice Areas</span>
                <span className="font-medium">{firm.practice_areas.length}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Verified</span>
                <div className="flex items-center space-x-1">
                  {firm.verified ? (
                    <>
                      <Verified className="h-4 w-4 text-blue-500" />
                      <span className="text-blue-600 font-medium">Yes</span>
                    </>
                  ) : (
                    <span className="text-gray-500">No</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Write a Review
              </Button>
              
              <Button variant="outline" className="w-full">
                <Phone className="h-4 w-4 mr-2" />
                Call Now
              </Button>
              
              <Button variant="outline" className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
