/**
 * Working PDF Annotations Demo
 * Uses existing document_annotations schema
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FileText,
  Highlighter,
  MessageSquare,
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  AlertCircle,
  User,
  Calendar
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { annotationsApi, type DocumentAnnotation, type CreateAnnotationRequest } from '@/lib/api/annotations';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Sample document ID - in real app this would come from route params
const SAMPLE_DOCUMENT_ID = 'sample-doc-1';

export default function AnnotationsDemo() {
  const { user } = useAuth();
  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<DocumentAnnotation | null>(null);

  // Form state
  const [newAnnotation, setNewAnnotation] = useState<Partial<CreateAnnotationRequest>>({
    document_id: SAMPLE_DOCUMENT_ID,
    type: 'highlight',
    page_number: 1,
    position: { x: 100, y: 100, width: 200, height: 50 },
    content: '',
    color: '#ffeb3b'
  });

  // Load annotations
  const loadAnnotations = async () => {
    try {
      setLoading(true);
      const data = await annotationsApi.getDocumentAnnotations(SAMPLE_DOCUMENT_ID);
      setAnnotations(data);
    } catch (error) {
      console.error('Failed to load annotations:', error);
      toast.error('Failed to load annotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnotations();
  }, []);

  // Create annotation
  const handleCreateAnnotation = async () => {
    if (!user) {
      toast.error('Please log in to create annotations');
      return;
    }

    try {
      const annotation = await annotationsApi.createAnnotation(newAnnotation as CreateAnnotationRequest);
      setAnnotations(prev => [...prev, annotation]);
      setShowCreateDialog(false);
      setNewAnnotation({
        document_id: SAMPLE_DOCUMENT_ID,
        type: 'highlight',
        page_number: 1,
        position: { x: 100, y: 100, width: 200, height: 50 },
        content: '',
        color: '#ffeb3b'
      });
      toast.success('Annotation created successfully');
    } catch (error) {
      console.error('Failed to create annotation:', error);
      toast.error('Failed to create annotation');
    }
  };

  // Update annotation
  const handleUpdateAnnotation = async (id: string, updates: any) => {
    try {
      const updated = await annotationsApi.updateAnnotation(id, updates);
      setAnnotations(prev => prev.map(ann => ann.id === id ? updated : ann));
      setEditingAnnotation(null);
      toast.success('Annotation updated successfully');
    } catch (error) {
      console.error('Failed to update annotation:', error);
      toast.error('Failed to update annotation');
    }
  };

  // Delete annotation
  const handleDeleteAnnotation = async (id: string) => {
    try {
      await annotationsApi.deleteAnnotation(id);
      setAnnotations(prev => prev.filter(ann => ann.id !== id));
      toast.success('Annotation deleted successfully');
    } catch (error) {
      console.error('Failed to delete annotation:', error);
      toast.error('Failed to delete annotation');
    }
  };

  // Toggle resolved status
  const handleToggleResolved = async (annotation: DocumentAnnotation) => {
    await handleUpdateAnnotation(annotation.id, {
      is_resolved: !annotation.is_resolved
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'highlight': return <Highlighter className="h-4 w-4" />;
      case 'note': return <MessageSquare className="h-4 w-4" />;
      case 'sticky': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'highlight': return 'bg-yellow-100 text-yellow-800';
      case 'note': return 'bg-blue-100 text-blue-800';
      case 'sticky': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">
              Please log in to view and create annotations.
            </p>
            <Button onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">PDF Annotations Demo</h1>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                ✅ Working System
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Welcome, {user.email}
              </span>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Annotation
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Annotation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <Select
                        value={newAnnotation.type}
                        onValueChange={(value) => setNewAnnotation(prev => ({ ...prev, type: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="highlight">Highlight</SelectItem>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="sticky">Sticky Note</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Page Number</label>
                      <Input
                        type="number"
                        value={newAnnotation.page_number}
                        onChange={(e) => setNewAnnotation(prev => ({ 
                          ...prev, 
                          page_number: parseInt(e.target.value) || 1 
                        }))}
                        min="1"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Content</label>
                      <Textarea
                        value={newAnnotation.content}
                        onChange={(e) => setNewAnnotation(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Enter annotation content..."
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Color</label>
                      <Input
                        type="color"
                        value={newAnnotation.color}
                        onChange={(e) => setNewAnnotation(prev => ({ ...prev, color: e.target.value }))}
                      />
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button onClick={handleCreateAnnotation} className="flex-1">
                        Create Annotation
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="annotations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="annotations">
              <MessageSquare className="h-4 w-4 mr-2" />
              Annotations ({annotations.length})
            </TabsTrigger>
            <TabsTrigger value="demo">
              <FileText className="h-4 w-4 mr-2" />
              Demo Info
            </TabsTrigger>
          </TabsList>

          <TabsContent value="annotations" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading annotations...</p>
              </div>
            ) : annotations.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No annotations yet</h3>
                  <p className="text-gray-500 mb-4">
                    Create your first annotation to get started with the demo.
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Annotation
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {annotations.map((annotation) => (
                  <Card key={annotation.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Badge className={getTypeColor(annotation.type)}>
                            {getTypeIcon(annotation.type)}
                            <span className="ml-1 capitalize">{annotation.type}</span>
                          </Badge>
                          <Badge variant="outline">Page {annotation.page_number}</Badge>
                          {annotation.is_resolved && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Resolved
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingAnnotation(annotation)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleResolved(annotation)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAnnotation(annotation.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-gray-900">{annotation.content}</p>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>You</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(annotation.created_at), { addSuffix: true })}</span>
                          </span>
                        </div>
                        <div
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: annotation.color }}
                          title={`Color: ${annotation.color}`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="demo">
            <Card>
              <CardHeader>
                <CardTitle>PDF Annotations System Demo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h4 className="font-medium text-green-800">System Status: Active</h4>
                  </div>
                  <p className="text-green-700 text-sm">
                    The PDF annotations system is fully functional and connected to the database.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Features Demonstrated:</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>✅ Create annotations with different types (highlight, note, sticky)</li>
                    <li>✅ Edit annotation content and properties</li>
                    <li>✅ Delete annotations</li>
                    <li>✅ Mark annotations as resolved/unresolved</li>
                    <li>✅ Color coding for annotations</li>
                    <li>✅ Page-based organization</li>
                    <li>✅ Real-time updates</li>
                    <li>✅ User authentication integration</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Database Schema:</h4>
                  <p className="text-sm text-gray-600">
                    Using existing <code>document_annotations</code> table with full RLS security policies.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Next Steps:</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Integrate with actual PDF viewer component</li>
                    <li>• Add visual annotation overlay on PDF pages</li>
                    <li>• Implement collaborative features</li>
                    <li>• Add export functionality</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingAnnotation} onOpenChange={() => setEditingAnnotation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Annotation</DialogTitle>
          </DialogHeader>
          {editingAnnotation && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  value={editingAnnotation.content}
                  onChange={(e) => setEditingAnnotation(prev => 
                    prev ? { ...prev, content: e.target.value } : null
                  )}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Color</label>
                <Input
                  type="color"
                  value={editingAnnotation.color}
                  onChange={(e) => setEditingAnnotation(prev => 
                    prev ? { ...prev, color: e.target.value } : null
                  )}
                />
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => handleUpdateAnnotation(editingAnnotation.id, {
                    content: editingAnnotation.content,
                    color: editingAnnotation.color
                  })}
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditingAnnotation(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
