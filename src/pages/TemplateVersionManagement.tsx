import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TemplateVersionHistory,
  TemplateVersionCreator,
  TemplateVersionComparison
} from '@/components/templates';
import { templateMarketplaceService, type Template } from '@/lib/services/templateMarketplace';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/lib/config/constants';
import { 
  ArrowLeft, 
  GitBranch, 
  History, 
  GitCompare, 
  Plus, 
  Settings,
  AlertCircle,
  CheckCircle,
  Eye,
  Edit
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export default function TemplateVersionManagement() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('history');

  useEffect(() => {
    if (slug) {
      loadTemplate(slug);
    }
  }, [slug]);

  const loadTemplate = async (templateSlug: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const templateData = await templateMarketplaceService.getTemplateBySlug(templateSlug);
      
      if (!templateData) {
        setError('Template not found');
        return;
      }

      // Check if user has permission to manage this template
      if (!user || templateData.createdBy !== user.id) {
        setError('You do not have permission to manage this template');
        return;
      }

      setTemplate(templateData);
    } catch (err: any) {
      console.error('Error loading template:', err);
      setError(err.message || 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleVersionCreated = (versionId: string) => {
    toast.success('New version created successfully!');
    // Refresh the template data to get updated version info
    if (slug) {
      loadTemplate(slug);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-32 w-full" />
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-6">
              {error || 'You do not have permission to access this template\'s version management.'}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => navigate(ROUTES.templateBrowser)} className="flex-1">
                Browse Templates
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(ROUTES.templateBrowser)}
              className="p-0 h-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Templates
            </Button>
            <span>/</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(`${ROUTES.templatePreview}/${slug}`)}
              className="p-0 h-auto"
            >
              {template.title}
            </Button>
            <span>/</span>
            <span className="text-gray-900">Version Management</span>
          </div>

          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                  <GitBranch className="h-8 w-8 text-blue-600" />
                  Version Management
                </h1>
                <p className="text-lg text-gray-600 mb-4">
                  Manage versions, track changes, and collaborate on "{template.title}"
                </p>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      Current: v{template.version}
                    </Badge>
                    <Badge variant="secondary">
                      {template.versionCount} version{template.versionCount !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {template.accessLevel} template
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(`${ROUTES.templatePreview}/${slug}`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Template
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`${ROUTES.templateCustomize}/${slug}`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Template
                </Button>
              </div>
            </div>
          </div>

          {/* Version Management Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Version History
              </TabsTrigger>
              <TabsTrigger value="compare" className="flex items-center gap-2">
                <GitCompare className="h-4 w-4" />
                Compare Versions
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Version
              </TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="mt-6">
              <TemplateVersionHistory 
                templateId={template.id}
                currentVersionId={template.currentVersionId}
              />
            </TabsContent>

            <TabsContent value="compare" className="mt-6">
              <TemplateVersionComparison 
                templateId={template.id}
              />
            </TabsContent>

            <TabsContent value="create" className="mt-6">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Create New Version
                      </CardTitle>
                      <CardDescription>
                        Create a new version of this template with your changes and improvements.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TemplateVersionCreator
                        templateId={template.id}
                        currentTitle={template.title}
                        currentDescription={template.description}
                        currentContent={template.content}
                        currentFields={template.fields}
                        onVersionCreated={handleVersionCreated}
                      />
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  {/* Current Version Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Current Version</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Version</span>
                        <Badge>v{template.version}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status</span>
                        <Badge variant="default">Published</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Fields</span>
                        <span className="text-sm text-gray-600">{template.fields.length}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Version Guidelines */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Version Guidelines</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="font-medium">Major (x.0.0):</span> Breaking changes, new features
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="font-medium">Minor (1.x.0):</span> New features, improvements
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="font-medium">Patch (1.0.x):</span> Bug fixes, corrections
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Best Practices */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Best Practices</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-gray-600">
                      <p>• Always provide clear change summaries</p>
                      <p>• Test templates before publishing</p>
                      <p>• Mark breaking changes appropriately</p>
                      <p>• Include migration notes for major changes</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
