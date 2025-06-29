import React from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KnowledgeBaseManager } from '@/components/rag/KnowledgeBaseManager';
import { RAGChat } from '@/components/rag/RAGChat';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Database, MessageSquare, Info, Shield } from 'lucide-react';
import { useSafeAuth } from '@/contexts/AuthContext';

const RAGKnowledge: React.FC = () => {
  const { profile, loading } = useSafeAuth();

  // Show loading state while profile is being fetched
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Brain className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Loading RAG Knowledge System...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Redirect non-admin users
  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin')) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">RAG Knowledge System</h1>
          <p className="text-gray-600">
            Manage your legal knowledge base and test AI-powered responses
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>What is RAG?</strong> Retrieval-Augmented Generation combines your knowledge base 
            with AI to provide accurate, source-backed answers. Add legal documents, cases, and guides 
            to improve AI responses.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="chat" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>RAG Chat</span>
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>Manage Knowledge</span>
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>How It Works</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Test RAG Assistant</span>
                </CardTitle>
                <CardDescription>
                  Ask legal questions and get AI responses backed by your knowledge base
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RAGChat />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            <KnowledgeBaseManager />
          </TabsContent>

          <TabsContent value="guide" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>How RAG Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-100 rounded-full p-2">
                        <span className="text-blue-600 font-bold text-sm">1</span>
                      </div>
                      <div>
                        <h4 className="font-medium">Add Knowledge</h4>
                        <p className="text-sm text-gray-600">
                          Upload legal documents, cases, statutes, and guides to your knowledge base.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-100 rounded-full p-2">
                        <span className="text-blue-600 font-bold text-sm">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium">Automatic Processing</h4>
                        <p className="text-sm text-gray-600">
                          Content is automatically chunked and converted to embeddings for semantic search.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-100 rounded-full p-2">
                        <span className="text-blue-600 font-bold text-sm">3</span>
                      </div>
                      <div>
                        <h4 className="font-medium">Smart Retrieval</h4>
                        <p className="text-sm text-gray-600">
                          When you ask a question, the system finds the most relevant knowledge chunks.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-100 rounded-full p-2">
                        <span className="text-blue-600 font-bold text-sm">4</span>
                      </div>
                      <div>
                        <h4 className="font-medium">AI Generation</h4>
                        <p className="text-sm text-gray-600">
                          AI generates accurate answers using the retrieved knowledge as context.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Best Practices</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-green-600">✓ Do</h4>
                      <ul className="text-sm text-gray-600 space-y-1 ml-4">
                        <li>• Add authoritative legal sources</li>
                        <li>• Include case law and statutes</li>
                        <li>• Use clear, descriptive titles</li>
                        <li>• Tag content with practice areas</li>
                        <li>• Keep content up-to-date</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-red-600">✗ Don't</h4>
                      <ul className="text-sm text-gray-600 space-y-1 ml-4">
                        <li>• Add outdated or superseded laws</li>
                        <li>• Include personal opinions</li>
                        <li>• Use vague or unclear titles</li>
                        <li>• Forget to specify jurisdiction</li>
                        <li>• Add duplicate content</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Content Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm"><strong>Legal Documents:</strong> Contracts, agreements, forms</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm"><strong>Case Law:</strong> Court decisions and precedents</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm"><strong>Statutes:</strong> Laws and regulations</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-sm"><strong>Regulations:</strong> Administrative rules</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm"><strong>FAQs:</strong> Common questions and answers</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      <span className="text-sm"><strong>Guides:</strong> How-to and explanatory content</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Technical Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-2">
                    <div>
                      <strong>Embedding Model:</strong> OpenAI text-embedding-ada-002
                    </div>
                    <div>
                      <strong>Chunk Size:</strong> 1000 characters with 200 character overlap
                    </div>
                    <div>
                      <strong>Similarity Threshold:</strong> 0.7 (70% similarity)
                    </div>
                    <div>
                      <strong>Max Results:</strong> 5 most relevant chunks per query
                    </div>
                    <div>
                      <strong>AI Model:</strong> GPT-4 for response generation
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default RAGKnowledge;
