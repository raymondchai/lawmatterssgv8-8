import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthenticatedRoute } from '@/components/auth/ProtectedRoute';
import { useSafeAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, MessageSquare, Files, User, Home, Brain } from 'lucide-react';
import { ROUTES } from '@/lib/config/constants';

const Dashboard: React.FC = () => {
  const { user, profile, signOut, loading, forceRefreshProfile } = useSafeAuth();
  const navigate = useNavigate();
  const [profileRefreshed, setProfileRefreshed] = useState(false);

  // Debug logging
  console.log('Dashboard - User:', user?.email);
  console.log('Dashboard - Profile:', profile);
  console.log('Dashboard - Profile Role:', profile?.role);
  console.log('Dashboard - Profile Subscription:', profile?.subscription_tier);
  console.log('Dashboard - Loading:', loading);

  // Force refresh profile if role is missing or inconsistent
  useEffect(() => {
    const refreshProfileIfNeeded = async () => {
      if (user && !profileRefreshed && (!profile?.role || profile.role === 'user')) {
        console.log('Dashboard: Force refreshing profile due to missing/incorrect role data');
        try {
          await forceRefreshProfile();
          setProfileRefreshed(true);
        } catch (error) {
          console.error('Dashboard: Error force refreshing profile:', error);
        }
      }
    };

    // Only run after initial loading is complete
    if (!loading) {
      refreshProfileIfNeeded();
    }
  }, [user, profile, forceRefreshProfile, profileRefreshed, loading]);

  const handleSignOut = async () => {
    try {
      console.log('Signing out from dashboard...');
      await signOut();
      // The signOut function now handles navigation automatically
    } catch (error) {
      console.error('Error signing out:', error);
      // Fallback navigation if signOut fails
      window.location.href = '/';
    }
  };

  // Show loading state while profile is being fetched
  if (loading) {
    return (
      <AuthenticatedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait while we fetch your profile</p>
          </div>
        </div>
      </AuthenticatedRoute>
    );
  }

  return (
    <AuthenticatedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/')}
                  className="flex items-center space-x-2"
                >
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Homepage</span>
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                  <p className="text-gray-600">
                    Welcome back, {profile?.first_name || user?.email}!
                  </p>
                </div>
              </div>
              <Button onClick={handleSignOut} variant="outline">
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Documents</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    Total uploaded documents
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">AI Chats</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    AI conversations this month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Templates</CardTitle>
                  <Files className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    Custom templates created
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {profile?.role === 'super_admin' || profile?.role === 'admin' ? 'Role' : 'Subscription'}
                  </CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">
                    {profile?.role === 'super_admin' ? 'Super Admin' :
                     profile?.role === 'admin' ? 'Admin' :
                     profile?.subscription_tier || 'Free'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {profile?.role === 'super_admin' || profile?.role === 'admin' ? 'Administrative access' : 'Current plan'}
                  </p>
                  {/* Debug info for role issues */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-2 text-xs text-gray-400 border-t pt-2">
                      Debug: Role={profile?.role}, Tier={profile?.subscription_tier}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Documents</CardTitle>
                  <CardDescription>
                    Upload and process your legal documents with AI
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to={ROUTES.documents}>
                    <Button className="w-full">
                      <FileText className="mr-2 h-4 w-4" />
                      Upload Document
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>AI Assistant</CardTitle>
                  <CardDescription>
                    Get legal insights and answers from our AI
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/dashboard/ai-assistant" className="block">
                    <Button className="w-full">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Start Chat
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* RAG Knowledge Card - Only visible for super_admin users */}
              {profile?.role === 'super_admin' && (
                <Card className="border-2 border-blue-500">
                  <CardHeader>
                    <CardTitle className="text-blue-600">RAG Knowledge</CardTitle>
                    <CardDescription>
                      Manage AI knowledge base and test responses
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link to="/dashboard/rag-knowledge" className="block">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700">
                        <Brain className="mr-2 h-4 w-4" />
                        RAG Knowledge
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Browse Templates</CardTitle>
                  <CardDescription>
                    Explore legal document templates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/dashboard/templates" className="block">
                    <Button className="w-full">
                      <Files className="mr-2 h-4 w-4" />
                      View Templates
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </AuthenticatedRoute>
  );
};

export default Dashboard;
