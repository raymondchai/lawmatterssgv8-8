import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  FileText, 
  MessageSquare, 
  Zap, 
  TrendingUp,
  Clock,
  Target
} from 'lucide-react';
import { AIChat } from '@/components/legal/AIChat';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { documentsApi } from '@/lib/api/documents';
import { useAuth } from '@/contexts/AuthContext';
import type { UploadedDocument } from '@/types';

const AIAssistant: React.FC = () => {
  const [recentDocuments, setRecentDocuments] = useState<UploadedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadRecentDocuments = async () => {
      try {
        const documents = await documentsApi.getDocuments();
        // Get the 5 most recent documents with OCR text
        const documentsWithText = documents
          .filter(doc => doc.ocr_text && doc.processing_status === 'completed')
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5);
        setRecentDocuments(documentsWithText);
      } catch (error) {
        console.error('Failed to load recent documents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadRecentDocuments();
    }
  }, [user]);

  const aiFeatures = [
    {
      icon: MessageSquare,
      title: 'Legal Q&A',
      description: 'Ask questions about Singapore law and get instant answers',
      color: 'text-blue-600'
    },
    {
      icon: FileText,
      title: 'Document Analysis',
      description: 'Get AI-powered insights from your uploaded documents',
      color: 'text-green-600'
    },
    {
      icon: Brain,
      title: 'Smart Search',
      description: 'Find relevant information using semantic search',
      color: 'text-purple-600'
    },
    {
      icon: Zap,
      title: 'Quick Summaries',
      description: 'Get concise summaries of complex legal documents',
      color: 'text-yellow-600'
    }
  ];

  const usageTips = [
    'Ask specific questions about your documents for better results',
    'Use natural language - no need for legal jargon',
    'Reference document names or types for context',
    'Ask for explanations of legal terms or concepts',
    'Request summaries of long documents'
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Legal Assistant</h1>
            <p className="text-gray-600 mt-1">
              Get instant help with legal questions and document analysis
            </p>
          </div>
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Brain className="h-3 w-3" />
            <span>Powered by GPT-4</span>
          </Badge>
        </div>

        <Tabs defaultValue="chat" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat">AI Chat</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="tips">Usage Tips</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* AI Chat Interface */}
              <div className="lg:col-span-2">
                <AIChat className="h-[700px]" />
              </div>

              {/* Sidebar with Context */}
              <div className="space-y-4">
                {/* Recent Documents */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>Recent Documents</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Documents available for AI analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {isLoading ? (
                      <div className="text-sm text-gray-500">Loading...</div>
                    ) : recentDocuments.length > 0 ? (
                      recentDocuments.map((doc) => (
                        <div key={doc.id} className="p-2 border rounded-lg">
                          <div className="text-sm font-medium truncate">
                            {doc.filename}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500">
                        No processed documents yet. Upload some documents to get started!
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Target className="h-4 w-4 mr-2" />
                      Analyze Latest Document
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Legal Trend Analysis
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Clock className="h-4 w-4 mr-2" />
                      Recent Legal Updates
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {aiFeatures.map((feature, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <feature.icon className={`h-5 w-5 ${feature.color}`} />
                      <span>{feature.title}</span>
                    </CardTitle>
                    <CardDescription>
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600">
                      {feature.title === 'Legal Q&A' && (
                        <ul className="space-y-1">
                          <li>• Ask about Singapore law and regulations</li>
                          <li>• Get explanations of legal concepts</li>
                          <li>• Understand legal procedures</li>
                        </ul>
                      )}
                      {feature.title === 'Document Analysis' && (
                        <ul className="space-y-1">
                          <li>• Extract key information from documents</li>
                          <li>• Identify important clauses and terms</li>
                          <li>• Get risk assessments</li>
                        </ul>
                      )}
                      {feature.title === 'Smart Search' && (
                        <ul className="space-y-1">
                          <li>• Find documents by meaning, not just keywords</li>
                          <li>• Discover related content</li>
                          <li>• Get contextual results</li>
                        </ul>
                      )}
                      {feature.title === 'Quick Summaries' && (
                        <ul className="space-y-1">
                          <li>• Get executive summaries</li>
                          <li>• Understand key points quickly</li>
                          <li>• Save time on document review</li>
                        </ul>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tips" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>How to Get the Best Results</CardTitle>
                <CardDescription>
                  Tips for effective AI interaction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {usageTips.map((tip, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-medium">{index + 1}</span>
                      </div>
                      <p className="text-sm text-gray-700">{tip}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Example Questions</CardTitle>
                <CardDescription>
                  Try asking these types of questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Document Questions</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• "What are the key terms in my contract?"</li>
                      <li>• "Summarize the main points of this agreement"</li>
                      <li>• "What are the payment obligations?"</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">Legal Questions</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• "What is the process for company incorporation in Singapore?"</li>
                      <li>• "Explain employment law requirements"</li>
                      <li>• "What are the data protection obligations?"</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AIAssistant;
