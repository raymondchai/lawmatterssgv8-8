import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthenticatedRoute } from '@/components/auth/ProtectedRoute';
import { DocumentUploadWrapper } from '@/components/legal/DocumentUploadWrapper';
import { DocumentList } from '@/components/legal/DocumentList';
import { DocumentViewer } from '@/components/legal/DocumentViewer';
import { DocumentSearch } from '@/components/legal/DocumentSearch';
import { DocumentStatusTracker } from '@/components/legal/DocumentStatusTracker';
import DocumentManagementDashboard from '@/components/documents/DocumentManagementDashboard';
import ErrorBoundary from '@/components/ErrorBoundary';
import DatabaseTest from '@/components/debug/DatabaseTest';
import { UploadDebug } from '@/components/debug/UploadDebug';
import UploadDiagnostics from '@/components/debug/UploadDiagnostics';
import ProductionDiagnostics from '@/components/debug/ProductionDiagnostics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  Search,
  List,
  BarChart3,
  X,
  FileText,
  TrendingUp,
  AlertCircle,
  Home,
  ArrowLeft,
  Menu
} from 'lucide-react';
import type { UploadedDocument } from '@/types';
import { useSafeAuth } from '@/contexts/AuthContext';

const Documents: React.FC = () => {
  const { profile, forceRefreshProfile } = useSafeAuth();
  const navigate = useNavigate();
  const [selectedDocument, setSelectedDocument] = useState<UploadedDocument | null>(null);
  const [searchResults, setSearchResults] = useState<UploadedDocument[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  const handleDocumentSelect = useCallback((document: UploadedDocument) => {
    setSelectedDocument(document);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setSelectedDocument(null);
  }, []);

  const handleUploadComplete = useCallback((documentId: string) => {
    // Trigger refresh of document lists
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleSearchResults = useCallback((documents: UploadedDocument[]) => {
    setSearchResults(documents);
  }, []);

  const handleSearchLoading = useCallback((loading: boolean) => {
    setIsSearching(loading);
  }, []);

  return (
    <AuthenticatedRoute>
      <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/')}
                    className="flex items-center space-x-1 px-2 sm:px-3"
                    title="Go to Homepage"
                  >
                    <Home className="h-4 w-4" />
                    <span className="hidden sm:inline">Home</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center space-x-1 px-2 sm:px-3"
                    title="Back to Dashboard"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Button>
                </div>
                <div className="hidden md:block">
                  <h1 className="text-3xl font-bold text-gray-900">Document Management</h1>
                  <p className="text-gray-600">
                    Upload, process, and manage your legal documents with AI
                  </p>
                </div>
                <div className="md:hidden">
                  <h1 className="text-xl font-bold text-gray-900">Documents</h1>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Subscription</p>
                  <p className="font-medium capitalize">
                    {profile?.subscription_tier || 'Free'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Debug: {JSON.stringify({tier: profile?.subscription_tier, email: profile?.email})}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await forceRefreshProfile();
                      console.log('Profile refreshed successfully');
                    } catch (error) {
                      console.error('Failed to refresh profile:', error);
                    }
                  }}
                  className="flex items-center space-x-1"
                  title="Refresh subscription status"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {selectedDocument ? (
              /* Document Viewer Mode */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button
                      onClick={handleCloseViewer}
                      variant="outline"
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Close Viewer
                    </Button>
                    <div>
                      <h2 className="text-xl font-semibold">Document Viewer</h2>
                      <p className="text-gray-600">Viewing: {selectedDocument.filename}</p>
                    </div>
                  </div>
                </div>
                
                <DocumentViewer
                  documentId={selectedDocument.id}
                  onClose={handleCloseViewer}
                  className="w-full"
                />
              </div>
            ) : (
              /* Main Dashboard Mode */
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="overview" className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Overview</span>
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="flex items-center space-x-2">
                    <Upload className="h-4 w-4" />
                    <span>Upload</span>
                  </TabsTrigger>
                  <TabsTrigger value="search" className="flex items-center space-x-2">
                    <Search className="h-4 w-4" />
                    <span>Search</span>
                  </TabsTrigger>
                  <TabsTrigger value="manage" className="flex items-center space-x-2">
                    <List className="h-4 w-4" />
                    <span>Manage</span>
                  </TabsTrigger>
                  <TabsTrigger value="enhanced" className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Enhanced</span>
                  </TabsTrigger>
                  <TabsTrigger value="debug" className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Debug</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  {/* Overview Dashboard */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Status Tracker - Takes 2 columns */}
                    <div className="lg:col-span-2">
                      <DocumentStatusTracker
                        onDocumentSelect={handleDocumentSelect}
                        refreshTrigger={refreshTrigger}
                      />
                    </div>
                    
                    {/* Quick Upload */}
                    <div>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center">
                            <Upload className="h-5 w-5 mr-2" />
                            Quick Upload
                          </CardTitle>
                          <CardDescription>
                            Upload documents for AI processing
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <DocumentUploadWrapper
                            onUploadComplete={handleUploadComplete}
                            maxFiles={3}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Recent Documents */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        Recent Documents
                      </CardTitle>
                      <CardDescription>
                        Your most recently uploaded documents
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DocumentList
                        onDocumentSelect={handleDocumentSelect}
                        refreshTrigger={refreshTrigger}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="upload" className="space-y-6">
                  {/* Upload Interface */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <DocumentUploadWrapper
                        onUploadComplete={handleUploadComplete}
                        maxFiles={10}
                      />
                    </div>
                    <div>
                      <DocumentStatusTracker
                        onDocumentSelect={handleDocumentSelect}
                        refreshTrigger={refreshTrigger}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="search" className="space-y-6">
                  {/* Search Interface */}
                  <div className="space-y-6">
                    <DocumentSearch
                      onResults={handleSearchResults}
                      onLoading={handleSearchLoading}
                    />
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center">
                          <Search className="h-5 w-5 mr-2" />
                          Search Results
                          {isSearching && (
                            <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                          )}
                        </CardTitle>
                        <CardDescription>
                          {searchResults.length > 0 
                            ? `Found ${searchResults.length} document${searchResults.length === 1 ? '' : 's'}`
                            : 'Enter search criteria to find documents'
                          }
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <DocumentList
                          onDocumentSelect={handleDocumentSelect}
                          refreshTrigger={refreshTrigger}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="manage" className="space-y-6">
                  {/* Management Interface */}
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center">
                            <List className="h-5 w-5 mr-2" />
                            All Documents
                          </CardTitle>
                          <CardDescription>
                            Manage all your uploaded documents
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <DocumentList
                            onDocumentSelect={handleDocumentSelect}
                            refreshTrigger={refreshTrigger}
                          />
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div>
                      <DocumentStatusTracker
                        onDocumentSelect={handleDocumentSelect}
                        refreshTrigger={refreshTrigger}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="enhanced" className="space-y-6">
                  {/* Enhanced Document Management Dashboard */}
                  <ErrorBoundary>
                    <DocumentManagementDashboard />
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="debug" className="space-y-6">
                  {/* Debug Information */}
                  <div className="space-y-6">
                    {/* Document Loading Debug */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center">
                          <AlertCircle className="h-5 w-5 mr-2" />
                          Document Loading Debug
                        </CardTitle>
                        <CardDescription>
                          Authentication and API connectivity status
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium mb-2">Current Status:</h4>
                            <div className="text-sm space-y-1">
                              <div>Authentication: <span className="font-mono">{profile ? 'Authenticated' : 'Not authenticated'}</span></div>
                              <div>User ID: <span className="font-mono">{profile?.id || 'N/A'}</span></div>
                              <div>Email: <span className="font-mono">{profile?.email || 'N/A'}</span></div>
                              <div>Subscription: <span className="font-mono">{profile?.subscription_tier || 'N/A'}</span></div>
                            </div>
                          </div>

                          <div className="p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-medium mb-2">Troubleshooting:</h4>
                            <div className="text-sm space-y-1">
                              <div>• Check browser console for detailed error messages</div>
                              <div>• Verify Supabase connection in Production Diagnostics below</div>
                              <div>• Try uploading a test document to verify the upload process</div>
                              <div>• Check if RLS policies are correctly configured</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <UploadDiagnostics />
                    <UploadDebug />
                    <ProductionDiagnostics />
                    <DatabaseTest />
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
      </div>
      </ErrorBoundary>
    </AuthenticatedRoute>
  );
};

export default Documents;
