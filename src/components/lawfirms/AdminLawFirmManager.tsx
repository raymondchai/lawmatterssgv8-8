import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Star,
  MessageSquare,
  Eye,
  Trash2,
  Plus
} from 'lucide-react';
import { lawFirmsApi } from '@/lib/api/lawFirms';
import type { LawFirm, LawFirmReview } from '@/types';
import { toast } from '@/components/ui/sonner';

interface AdminLawFirmManagerProps {
  className?: string;
}

export const AdminLawFirmManager: React.FC<AdminLawFirmManagerProps> = ({
  className = ''
}) => {
  const [lawFirms, setLawFirms] = useState<LawFirm[]>([]);
  const [pendingReviews, setPendingReviews] = useState<LawFirmReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('firms');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Note: These would need admin-specific API endpoints
      const firms = await lawFirmsApi.getLawFirms(); // Would need admin version
      setLawFirms(firms);
      
      // Load pending reviews (would need admin endpoint)
      // const reviews = await lawFirmsApi.getPendingReviews();
      // setPendingReviews(reviews);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyFirm = async (firmId: string, verified: boolean) => {
    try {
      await lawFirmsApi.verifyLawFirm(firmId, verified);
      toast.success(`Law firm ${verified ? 'verified' : 'unverified'} successfully`);
      loadData(); // Reload data
    } catch (error: any) {
      console.error('Error verifying firm:', error);
      toast.error('Failed to update verification status');
    }
  };

  const handleDeleteFirm = async (firmId: string) => {
    if (!confirm('Are you sure you want to delete this law firm? This action cannot be undone.')) {
      return;
    }

    try {
      await lawFirmsApi.deleteLawFirm(firmId);
      toast.success('Law firm deleted successfully');
      loadData(); // Reload data
    } catch (error: any) {
      console.error('Error deleting firm:', error);
      toast.error('Failed to delete law firm');
    }
  };

  const handleModerateReview = async (reviewId: string, status: 'approved' | 'rejected') => {
    try {
      await lawFirmsApi.moderateReview(reviewId, status);
      toast.success(`Review ${status} successfully`);
      loadData(); // Reload data
    } catch (error: any) {
      console.error('Error moderating review:', error);
      toast.error('Failed to moderate review');
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

  const stats = [
    {
      title: 'Total Law Firms',
      value: lawFirms.length,
      description: 'All registered firms',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Verified Firms',
      value: lawFirms.filter(f => f.verified).length,
      description: 'Approved and verified',
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      title: 'Pending Verification',
      value: lawFirms.filter(f => !f.verified).length,
      description: 'Awaiting approval',
      icon: Clock,
      color: 'text-yellow-600'
    },
    {
      title: 'Pending Reviews',
      value: pendingReviews.length,
      description: 'Awaiting moderation',
      icon: MessageSquare,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Law Firm Management</h2>
          <p className="text-gray-600">
            Manage law firm listings, verifications, and reviews
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Law Firm
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.description}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="firms">Law Firms ({lawFirms.length})</TabsTrigger>
          <TabsTrigger value="reviews">Pending Reviews ({pendingReviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="firms" className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {lawFirms.map((firm) => (
                <Card key={firm.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-900">{firm.name}</h3>
                            <Badge variant={firm.verified ? 'default' : 'secondary'}>
                              {firm.verified ? 'Verified' : 'Pending'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{firm.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>{firm.address}</span>
                            <span>{firm.phone}</span>
                            <div className="flex items-center space-x-1">
                              {renderStars(firm.rating)}
                              <span>{firm.rating.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {!firm.verified ? (
                          <Button 
                            size="sm"
                            onClick={() => handleVerifyFirm(firm.id, true)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Verify
                          </Button>
                        ) : (
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerifyFirm(firm.id, false)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Unverify
                          </Button>
                        )}
                        
                        <Button 
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteFirm(firm.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          {pendingReviews.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending reviews</h3>
                <p className="text-gray-500">
                  All reviews have been moderated.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingReviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{review.title}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="flex items-center space-x-1">
                              {renderStars(review.rating)}
                            </div>
                            <span className="text-sm text-gray-500">
                              by {review.user?.full_name || 'Anonymous'}
                            </span>
                          </div>
                        </div>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                      
                      <p className="text-gray-700">{review.content}</p>
                      
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm"
                          onClick={() => handleModerateReview(review.id, 'approved')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          variant="destructive"
                          size="sm"
                          onClick={() => handleModerateReview(review.id, 'rejected')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
