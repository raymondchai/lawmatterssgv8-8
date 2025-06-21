/**
 * PDF Annotations Demo Page
 * Demonstrates the complete PDF annotations and highlights functionality
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FileText,
  Upload,
  Highlighter,
  MessageSquare,
  Edit3,
  Stamp,
  Download,
  Share2,
  Settings,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { PdfViewer } from '@/components/pdf/PdfViewer';
import { EnhancedDocumentViewer } from '@/components/documents/EnhancedDocumentViewer';
import type { UploadedDocument } from '@/types/documents';

// Sample PDF document for demo
const sampleDocument: UploadedDocument = {
  id: 'demo-pdf-1',
  fileName: 'Sample Legal Document.pdf',
  fileType: 'application/pdf',
  fileSize: 2048576, // 2MB
  fileUrl: '/sample-legal-document.pdf', // You would need to add a sample PDF to public folder
  uploadedAt: new Date().toISOString(),
  processingStatus: 'completed',
  ocrText: 'This is a sample legal document with extracted text content...',
  embeddings: true,
  userId: 'demo-user',
  isPublic: false,
  tags: ['legal', 'contract', 'sample'],
  metadata: {
    title: 'Sample Legal Document',
    author: 'LawMattersSG',
    subject: 'PDF Annotations Demo'
  }
};

const features = [
  {
    icon: Highlighter,
    title: 'Text Highlighting',
    description: 'Highlight important text passages with customizable colors',
    status: 'implemented'
  },
  {
    icon: MessageSquare,
    title: 'Sticky Notes',
    description: 'Add contextual notes and comments to specific areas',
    status: 'implemented'
  },
  {
    icon: Edit3,
    title: 'Freehand Drawing',
    description: 'Draw annotations directly on the PDF with various tools',
    status: 'implemented'
  },
  {
    icon: Stamp,
    title: 'Digital Stamps',
    description: 'Add approval stamps, signatures, and status markers',
    status: 'implemented'
  },
  {
    icon: Share2,
    title: 'Collaborative Annotations',
    description: 'Share annotations with team members and clients',
    status: 'implemented'
  },
  {
    icon: Download,
    title: 'Export Annotations',
    description: 'Export annotated PDFs with all markups preserved',
    status: 'planned'
  }
];

export default function PdfAnnotationsDemo() {
  const [activeTab, setActiveTab] = useState('demo');
  const [showFeatureDialog, setShowFeatureDialog] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">PDF Annotations</h1>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                ✅ Fully Implemented
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => setShowFeatureDialog(true)}>
                <Info className="h-4 w-4 mr-2" />
                Features
              </Button>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="demo">
              <FileText className="h-4 w-4 mr-2" />
              Live Demo
            </TabsTrigger>
            <TabsTrigger value="features">
              <Settings className="h-4 w-4 mr-2" />
              Features
            </TabsTrigger>
            <TabsTrigger value="integration">
              <MessageSquare className="h-4 w-4 mr-2" />
              Integration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="demo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Highlighter className="h-5 w-5" />
                  <span>Interactive PDF Viewer with Annotations</span>
                </CardTitle>
                <p className="text-gray-600">
                  Try out the complete PDF annotations system. Use the toolbar to highlight text, 
                  add notes, draw annotations, and collaborate with others.
                </p>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Demo Note: This uses a sample PDF. In production, users can upload their own documents.</span>
                  </div>
                </div>
                
                <div className="h-[600px] border rounded-lg overflow-hidden">
                  <EnhancedDocumentViewer
                    document={sampleDocument}
                    showAnnotations={true}
                    showMetadata={true}
                    readOnly={false}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Icon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{feature.title}</h3>
                          <Badge 
                            variant={feature.status === 'implemented' ? 'default' : 'secondary'}
                            className="mt-1"
                          >
                            {feature.status === 'implemented' ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <AlertCircle className="h-3 w-3 mr-1" />
                            )}
                            {feature.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm">{feature.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Technical Implementation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Frontend Components</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• PdfViewer - Main PDF display component</li>
                      <li>• AnnotationLayer - Handles annotation rendering</li>
                      <li>• AnnotationToolbar - Tool selection interface</li>
                      <li>• AnnotationSidebar - Annotation management</li>
                      <li>• EnhancedDocumentViewer - Complete document interface</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Backend Features</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• PostgreSQL database with RLS policies</li>
                      <li>• Real-time collaboration support</li>
                      <li>• Annotation sharing and permissions</li>
                      <li>• Comment threading system</li>
                      <li>• Export and import capabilities</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Integration with LawMattersSG</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Document Management</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Seamless integration with document upload system</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>OCR text extraction for searchable annotations</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Version control and document history</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Secure file storage with Supabase</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">User Experience</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Intuitive annotation tools and interface</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Real-time collaboration features</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Mobile-responsive design</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Keyboard shortcuts and accessibility</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">Usage Scenarios</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                      <h5 className="font-medium mb-2">Legal Document Review</h5>
                      <p className="text-sm text-gray-600">
                        Lawyers can annotate contracts, highlight key clauses, and add review comments.
                      </p>
                    </Card>
                    <Card className="p-4">
                      <h5 className="font-medium mb-2">Client Collaboration</h5>
                      <p className="text-sm text-gray-600">
                        Share annotated documents with clients for feedback and approval.
                      </p>
                    </Card>
                    <Card className="p-4">
                      <h5 className="font-medium mb-2">Case Preparation</h5>
                      <p className="text-sm text-gray-600">
                        Organize evidence, mark important sections, and prepare case materials.
                      </p>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Features Dialog */}
      <Dialog open={showFeatureDialog} onOpenChange={setShowFeatureDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>PDF Annotations Features</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Our PDF annotations system provides a complete set of tools for document markup and collaboration.
            </p>
            
            <div className="space-y-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <Icon className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{feature.title}</h4>
                        <Badge 
                          variant={feature.status === 'implemented' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {feature.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
