import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Star, 
  TrendingUp, 
  MapPin,
  Search,
  Plus,
  Verified
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LawFirmDirectory } from '@/components/lawfirms/LawFirmDirectory';
import { LawFirmProfile } from '@/components/lawfirms/LawFirmProfile';
import { ReviewForm } from '@/components/lawfirms/ReviewForm';
import { lawFirmsApi } from '@/lib/api/lawFirms';
import type { LawFirm } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const LawFirms: React.FC = () => {
  const [currentView, setCurrentView] = useState<'directory' | 'profile' | 'review'>('directory');
  const [selectedFirm, setSelectedFirm] = useState<LawFirm | null>(null);
  const [featuredFirms, setFeaturedFirms] = useState<LawFirm[]>([]);
  const [recentFirms, setRecentFirms] = useState<LawFirm[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadFeaturedData();
  }, []);

  const loadFeaturedData = async () => {
    try {
      setLoading(true);
      const [topRated, recent] = await Promise.all([
        lawFirmsApi.getTopRatedLawFirms(6),
        lawFirmsApi.getRecentLawFirms(3)
      ]);
      setFeaturedFirms(topRated);
      setRecentFirms(recent);
    } catch (error) {
      console.error('Error loading featured data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFirmSelect = (firm: LawFirm) => {
    setSelectedFirm(firm);
    setCurrentView('profile');
  };

  const handleWriteReview = () => {
    if (selectedFirm) {
      setCurrentView('review');
    }
  };

  const handleReviewSubmitted = () => {
    setCurrentView('profile');
    // Optionally reload the firm data to show updated rating
  };

  const handleBackToDirectory = () => {
    setCurrentView('directory');
    setSelectedFirm(null);
  };

  const handleBackToProfile = () => {
    setCurrentView('profile');
  };

  const directoryStats = [
    {
      title: 'Total Law Firms',
      value: '150+',
      description: 'Verified legal professionals',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Average Rating',
      value: '4.2',
      description: 'Based on client reviews',
      icon: Star,
      color: 'text-yellow-600'
    },
    {
      title: 'Practice Areas',
      value: '12+',
      description: 'Specialized legal services',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      title: 'Locations',
      value: 'Singapore',
      description: 'Nationwide coverage',
      icon: MapPin,
      color: 'text-purple-600'
    }
  ];

  if (currentView === 'profile' && selectedFirm) {
    return (
      <DashboardLayout>
        <LawFirmProfile
          firmId={selectedFirm.id}
          onBack={handleBackToDirectory}
        />
        {/* Add floating action button for writing review */}
        <div className="fixed bottom-6 right-6">
          <Button onClick={handleWriteReview} size="lg" className="rounded-full shadow-lg">
            <Plus className="h-5 w-5 mr-2" />
            Write Review
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (currentView === 'review' && selectedFirm) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleBackToProfile}>
              ← Back to {selectedFirm.name}
            </Button>
          </div>
          <ReviewForm
            lawFirm={selectedFirm}
            onReviewSubmitted={handleReviewSubmitted}
            onCancel={handleBackToProfile}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Law Firm Directory</h1>
            <p className="text-gray-600 mt-1">
              Find and connect with verified legal professionals in Singapore
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Search className="h-4 w-4 mr-2" />
              Advanced Search
            </Button>
            {user?.role === 'admin' && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Law Firm
              </Button>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {directoryStats.map((stat, index) => (
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

        {/* Featured Sections */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Rated Firms */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span>Top Rated Law Firms</span>
                  </CardTitle>
                  <CardDescription>
                    Highest rated legal professionals based on client reviews
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {featuredFirms.slice(0, 4).map((firm) => (
                      <div
                        key={firm.id}
                        className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleFirmSelect(firm)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium truncate flex items-center space-x-1">
                            <span>{firm.name}</span>
                            {firm.verified && (
                              <Verified className="h-4 w-4 text-blue-500" />
                            )}
                          </h3>
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="text-sm font-medium">{firm.rating.toFixed(1)}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {firm.description}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {firm.practice_areas.slice(0, 2).map((area, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recently Added */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <span>Recently Added</span>
                  </CardTitle>
                  <CardDescription>
                    New law firms in our directory
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentFirms.map((firm) => (
                      <div
                        key={firm.id}
                        className="p-3 border rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
                        onClick={() => handleFirmSelect(firm)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm truncate flex items-center space-x-1">
                            <span>{firm.name}</span>
                            {firm.verified && (
                              <Verified className="h-3 w-3 text-blue-500" />
                            )}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            New
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-1">
                          {firm.practice_areas.slice(0, 2).join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Main Directory */}
        <LawFirmDirectory onFirmSelect={handleFirmSelect} />
      </div>
    </DashboardLayout>
  );
};

export default LawFirms;
