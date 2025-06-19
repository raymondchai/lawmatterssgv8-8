import React, { useState, useCallback } from 'react';
import { AuthenticatedRoute } from '@/components/auth/ProtectedRoute';
import { DocumentUpload } from '@/components/legal/DocumentUpload';
import { DocumentList } from '@/components/legal/DocumentList';
import { DocumentViewer } from '@/components/legal/DocumentViewer';
import { DocumentSearch } from '@/components/legal/DocumentSearch';
import { DocumentStatusTracker } from '@/components/legal/DocumentStatusTracker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Search, 
  List, 
  BarChart3, 
  Eye, 
  X,
  FileText,
  TrendingUp
} from 'lucide-react';
import type { UploadedDocument } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const Documents: React.FC = () => {
  const { profile } = useAuth();
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
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Document Management</h1>
                <p className="text-gray-600">
                  Upload, process, and manage your legal documents with AI
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Subscription</p>
                  <p className="font-medium capitalize">
                    {profile?.subscription_tier || 'Free'}
                  </p>
                </div>
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
                <TabsList className="grid w-full grid-cols-4">
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
                          <DocumentUpload
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
                      <DocumentUpload
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
              </Tabs>
            )}
          </div>
        </main>
      </div>
    </AuthenticatedRoute>
  );
};

export default Documents;
