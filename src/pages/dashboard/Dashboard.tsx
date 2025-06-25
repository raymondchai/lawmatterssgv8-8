import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthenticatedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, MessageSquare, Files, User, Home } from 'lucide-react';
import { ROUTES } from '@/lib/config/constants';

const Dashboard: React.FC = () => {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();

  // Debug logging
  console.log('Dashboard - User:', user?.email);
  console.log('Dashboard - Profile:', profile);
  console.log('Dashboard - Profile Role:', profile?.role);
  console.log('Dashboard - Profile Subscription:', profile?.subscription_tier);
  console.log('Dashboard - Loading:', loading);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <Button className="w-full">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Start Chat
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Browse Templates</CardTitle>
                  <CardDescription>
                    Explore legal document templates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">
                    <Files className="mr-2 h-4 w-4" />
                    View Templates
                  </Button>
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
