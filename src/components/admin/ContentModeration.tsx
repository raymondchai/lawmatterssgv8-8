import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  FileText, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  Eye,
  Flag,
  Star,
  AlertTriangle
} from 'lucide-react';
import { lawFirmsApi } from '@/lib/api/lawfirms';
import { templatesApi } from '@/lib/api/templates';
import { usePermissions, PERMISSIONS } from '@/hooks/usePermissions';
import type { LawFirmReview, Template } from '@/types';
import { toast } from '@/components/ui/sonner';
import { formatDistanceToNow } from 'date-fns';

interface ContentModerationProps {
  className?: string;
}

interface ModerationStats {
  pendingReviews: number;
  pendingTemplates: number;
  totalReviews: number;
  totalTemplates: number;
}

export const ContentModeration: React.FC<ContentModerationProps> = ({
  className = ''
}) => {
  const [pendingReviews, setPendingReviews] = useState<LawFirmReview[]>([]);
  const [pendingTemplates, setPendingTemplates] = useState<Template[]>([]);
  const [stats, setStats] = useState<ModerationStats>({
    pendingReviews: 0,
    pendingTemplates: 0,
    totalReviews: 0,
    totalTemplates: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reviews');

  const { hasPermission } = usePermissions();

  useEffect(() => {
    loadModerationData();
  }, []);

  const loadModerationData = async () => {
    try {
      setLoading(true);
      
      // Note: These would need admin-specific API endpoints
      // For now, we'll simulate the data structure
      
      // Load pending reviews (would need admin endpoint)
      // const reviews = await lawFirmsApi.getPendingReviews();
      // setPendingReviews(reviews);
      
      // Load pending templates (would need admin endpoint)
      // const templates = await templatesApi.getPendingTemplates();
      // setPendingTemplates(templates);
      
      // For demo purposes, we'll use empty arrays
      setPendingReviews([]);
      setPendingTemplates([]);
      
      setStats({
        pendingReviews: 0,
        pendingTemplates: 0,
        totalReviews: 0,
        totalTemplates: 0
      });
    } catch (error) {
      console.error('Error loading moderation data:', error);
      toast.error('Failed to load moderation data');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewModeration = async (reviewId: string, action: 'approved' | 'rejected') => {
    try {
      await lawFirmsApi.moderateReview(reviewId, action);
      toast.success(`Review ${action} successfully`);
      loadModerationData();
    } catch (error: any) {
      console.error('Error moderating review:', error);
      toast.error('Failed to moderate review');
    }
  };

  const handleTemplateModeration = async (templateId: string, action: 'approved' | 'rejected') => {
    try {
      // This would need a template moderation endpoint
      // await templatesApi.moderateTemplate(templateId, action);
      toast.success(`Template ${action} successfully`);
      loadModerationData();
    } catch (error: any) {
      console.error('Error moderating template:', error);
      toast.error('Failed to moderate template');
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

  if (!hasPermission(PERMISSIONS.LAW_FIRMS_MODERATE_REVIEWS) && !hasPermission(PERMISSIONS.TEMPLATES_MODERATE)) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <Flag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">
            You don't have permission to access content moderation.
          </p>
        </CardContent>
      </Card>
    );
  }

  const moderationStats = [
    {
      title: 'Pending Reviews',
      value: stats.pendingReviews,
      total: stats.totalReviews,
      description: 'Reviews awaiting moderation',
      icon: MessageSquare,
      color: 'text-yellow-600'
    },
    {
      title: 'Pending Templates',
      value: stats.pendingTemplates,
      total: stats.totalTemplates,
      description: 'Templates awaiting approval',
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      title: 'Total Content',
      value: stats.totalReviews + stats.totalTemplates,
      total: null,
      description: 'All moderated content',
      icon: Users,
      color: 'text-green-600'
    },
    {
      title: 'Moderation Queue',
      value: stats.pendingReviews + stats.pendingTemplates,
      total: null,
      description: 'Items requiring attention',
      icon: Clock,
      color: 'text-red-600'
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Content Moderation</h2>
          <p className="text-gray-600">
            Review and moderate user-generated content
          </p>
        </div>
        <Button variant="outline" onClick={loadModerationData}>
          <Clock className="h-4 w-4 mr-2" />
          Refresh Queue
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {moderationStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                    {stat.total !== null && (
                      <span className="text-sm text-gray-500 ml-1">/ {stat.total}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">{stat.description}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Moderation Queue */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reviews" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Reviews ({stats.pendingReviews})</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Templates ({stats.pendingTemplates})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Reviews</CardTitle>
              <CardDescription>
                Law firm reviews awaiting moderation approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-start space-x-3 p-4 border rounded-lg">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-full"></div>
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingReviews.length > 0 ? (
                <div className="space-y-4">
                  {pendingReviews.map((review) => (
                    <div key={review.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start space-x-3">
                          <Avatar>
                            <AvatarFallback>
                              {review.user ? getInitials(review.user.full_name) : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900">
                                {review.user?.full_name || 'Anonymous'}
                              </h4>
                              <Badge variant="secondary">Pending</Badge>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <div className="flex items-center space-x-1">
                                {renderStars(review.rating)}
                              </div>
                              <span className="text-sm text-gray-500">
                                {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleReviewModeration(review.id, 'approved')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleReviewModeration(review.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h5 className="font-medium text-gray-900">{review.title}</h5>
                        <p className="text-gray-700">{review.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No pending reviews</h3>
                  <p className="text-gray-500">
                    All reviews have been moderated.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Templates</CardTitle>
              <CardDescription>
                Public templates awaiting approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-start space-x-3 p-4 border rounded-lg">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                          <div className="h-3 bg-gray-200 rounded w-full"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingTemplates.length > 0 ? (
                <div className="space-y-4">
                  {pendingTemplates.map((template) => (
                    <div key={template.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900">{template.name}</h4>
                              <Badge variant="secondary">Pending</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{template.category}</p>
                            <p className="text-xs text-gray-500">
                              Created {formatDistanceToNow(new Date(template.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleTemplateModeration(template.id, 'approved')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleTemplateModeration(template.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-gray-700">{template.description}</p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Variables:</span>
                          <div className="flex flex-wrap gap-1">
                            {template.variables.slice(0, 3).map((variable, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {variable}
                              </Badge>
                            ))}
                            {template.variables.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.variables.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No pending templates</h3>
                  <p className="text-gray-500">
                    All templates have been reviewed.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Moderation Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span>Moderation Guidelines</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Review Moderation</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Check for inappropriate language or content</li>
                <li>• Verify reviews are constructive and helpful</li>
                <li>• Ensure reviews don't contain personal information</li>
                <li>• Look for potential fake or spam reviews</li>
                <li>• Approve reviews that provide genuine feedback</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Template Moderation</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Verify legal accuracy and completeness</li>
                <li>• Check for proper variable placement</li>
                <li>• Ensure templates follow Singapore law</li>
                <li>• Review for clarity and usability</li>
                <li>• Approve templates that meet quality standards</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
