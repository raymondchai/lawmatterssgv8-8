import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3,
  Calendar,
  MessageSquare,
  Star,
  Users,
  Settings,
  Eye,
  Edit,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { lawFirmsApi } from '@/lib/api/lawFirms';
import type { LawFirm, LawFirmBooking, LawFirmReview, LawFirmTeamMember } from '@/types';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface LawFirmDashboardProps {
  lawFirmId: string;
}

export const LawFirmDashboard: React.FC<LawFirmDashboardProps> = ({ lawFirmId }) => {
  const { user } = useAuth();
  const [firm, setFirm] = useState<LawFirm | null>(null);
  const [bookings, setBookings] = useState<LawFirmBooking[]>([]);
  const [reviews, setReviews] = useState<LawFirmReview[]>([]);
  const [teamMembers, setTeamMembers] = useState<LawFirmTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, [lawFirmId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [firmData, bookingsData, reviewsData, teamData] = await Promise.all([
        lawFirmsApi.getLawFirm(lawFirmId),
        lawFirmsApi.getLawFirmBookings(lawFirmId),
        lawFirmsApi.getLawFirmReviews(lawFirmId),
        lawFirmsApi.getTeamMembers(lawFirmId)
      ]);

      setFirm(firmData);
      setBookings(bookingsData);
      setReviews(reviewsData);
      setTeamMembers(teamData);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleBookingStatusUpdate = async (bookingId: string, status: LawFirmBooking['status']) => {
    try {
      await lawFirmsApi.updateBookingStatus(bookingId, status);
      await loadDashboardData(); // Refresh data
      toast.success('Booking status updated successfully');
    } catch (error: any) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status');
    }
  };

  const getStatusColor = (status: LawFirmBooking['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!firm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Law Firm Not Found</h2>
          <p className="text-gray-600">Unable to load law firm information.</p>
        </div>
      </div>
    );
  }

  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{firm.name} Dashboard</h1>
              <p className="text-gray-600">Manage your law firm profile and client interactions</p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                View Public Profile
              </Button>
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingBookings}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Star className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Average Rating</p>
                  <p className="text-2xl font-bold text-gray-900">{averageRating.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Reviews</p>
                  <p className="text-2xl font-bold text-gray-900">{totalReviews}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Team Members</p>
                  <p className="text-2xl font-bold text-gray-900">{teamMembers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {bookings.slice(0, 5).map((booking) => (
                      <div key={booking.id} className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            New booking from {booking.user?.full_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button className="h-20 flex-col">
                      <Plus className="h-6 w-6 mb-2" />
                      Add Team Member
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <Edit className="h-6 w-6 mb-2" />
                      Edit Profile
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <BarChart3 className="h-6 w-6 mb-2" />
                      View Analytics
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <Settings className="h-6 w-6 mb-2" />
                      Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="mt-6">
            {/* Bookings content will be added in the next part */}
            <Card>
              <CardHeader>
                <CardTitle>Consultation Bookings</CardTitle>
                <CardDescription>Manage your consultation requests and appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Booking management interface will be implemented in the next phase.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            {/* Reviews content will be added in the next part */}
            <Card>
              <CardHeader>
                <CardTitle>Client Reviews</CardTitle>
                <CardDescription>Monitor and respond to client feedback</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Review management interface will be implemented in the next phase.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            {/* Team content will be added in the next part */}
            <Card>
              <CardHeader>
                <CardTitle>Team Management</CardTitle>
                <CardDescription>Manage your law firm team members and their profiles</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Team management interface will be implemented in the next phase.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
