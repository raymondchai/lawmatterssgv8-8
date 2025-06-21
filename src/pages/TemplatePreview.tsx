import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { templateMarketplaceService, type Template } from '@/lib/services/templateMarketplace';
import { TemplateRating } from '@/components/templates/TemplateRating';
import { TemplateAccessGate } from '@/components/templates/TemplateAccessGate';
import { TemplateVersionHistory } from '@/components/templates/TemplateVersionHistory';
import { ROUTES } from '@/lib/config/constants';
import {
  Star,
  Download,
  Eye,
  Share2,
  ArrowLeft,
  FileText,
  Settings,
  Shield,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Heart,
  MessageSquare,
  History
} from 'lucide-react';

export default function TemplatePreview() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('preview');
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    if (slug) {
      loadTemplate(slug);
    }
  }, [slug]);

  const loadTemplate = async (slug: string) => {
    try {
      setLoading(true);
      const templateData = await templateMarketplaceService.getTemplate(slug);
      
      if (!templateData) {
        setError('Template not found');
        return;
      }

      setTemplate(templateData);
      
      // Track template view
      await templateMarketplaceService.trackEvent(templateData.id, 'template_preview', {
        source: 'direct_link',
        category: templateData.category?.name,
        access_level: templateData.accessLevel
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomize = () => {
    if (!template) return;
    
    // Track customization start
    templateMarketplaceService.trackEvent(template.id, 'customization_started', {
      source: 'preview_page',
      access_level: template.accessLevel
    });
    
    navigate(`${ROUTES.templateCustomize}/${template.slug}`);
  };

  const handleDownload = async () => {
    if (!template) return;
    
    // Track download
    await templateMarketplaceService.recordDownload(template.id, undefined, 'pdf');
    
    // For now, just show alert - in production, this would trigger actual download
    alert('Download functionality will be implemented with the generation system');
  };

  const handleShare = async () => {
    if (!template) return;
    
    try {
      await navigator.share({
        title: template.title,
        text: template.description,
        url: window.location.href
      });
    } catch {
      // Fallback to clipboard
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const formatPrice = (price: number) => {
    return price === 0 ? 'Free' : `S$${price.toFixed(2)}`;
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <Skeleton className="h-8 w-32" />
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Template Not Found</h3>
            <p className="text-gray-600 mb-6">
              {error || 'The template you\'re looking for doesn\'t exist or has been removed.'}
            </p>
            <Button onClick={() => navigate(ROUTES.templateBrowser)}>
              Browse Templates
            </Button>
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
              Back to Templates
            </Button>
            <span>/</span>
            <span>{template.category?.name}</span>
            <span>/</span>
            <span className="text-gray-900">{template.title}</span>
          </div>

          <TemplateAccessGate
            templateAccessLevel={template.accessLevel as 'public' | 'premium' | 'enterprise'}
            templateId={template.id}
          >
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2">
              {/* Header */}
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {template.title}
                    </h1>
                    <p className="text-lg text-gray-600 mb-4">
                      {template.description}
                    </p>
                    
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-1">
                        {renderStars(template.ratingAverage)}
                        <span className="text-sm text-gray-600 ml-1">
                          {template.ratingAverage.toFixed(1)} ({template.ratingCount} reviews)
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Download className="h-4 w-4" />
                        {template.downloadCount.toLocaleString()} downloads
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{template.category?.name}</Badge>
                      {template.subcategory && (
                        <Badge variant="outline">{template.subcategory}</Badge>
                      )}
                      {template.accessLevel !== 'public' && (
                        <Badge variant="secondary">{template.accessLevel}</Badge>
                      )}
                      {template.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="text-right ml-6">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {formatPrice(template.priceSgd)}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsFavorited(!isFavorited)}
                      >
                        <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current text-red-500' : ''}`} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleShare}>
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="preview">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="fields">
                    <Settings className="h-4 w-4 mr-2" />
                    Fields
                  </TabsTrigger>
                  <TabsTrigger value="details">
                    <FileText className="h-4 w-4 mr-2" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="reviews">
                    <Star className="h-4 w-4 mr-2" />
                    Reviews
                  </TabsTrigger>
                  <TabsTrigger value="versions">
                    <History className="h-4 w-4 mr-2" />
                    Versions
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Document Preview</CardTitle>
                      <CardDescription>
                        This is how your document will look when generated
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {template.previewHtml ? (
                        <div 
                          className="prose max-w-none border rounded-lg p-6 bg-white"
                          dangerouslySetInnerHTML={{ __html: template.previewHtml }}
                        />
                      ) : template.previewPdfUrl ? (
                        <div className="border rounded-lg overflow-hidden">
                          <iframe
                            src={template.previewPdfUrl}
                            className="w-full h-96"
                            title="Template Preview"
                          />
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                          <p>Preview not available for this template</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="fields" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Customizable Fields</CardTitle>
                      <CardDescription>
                        These fields can be customized when you use this template
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {template.fields.length > 0 ? (
                        <div className="space-y-4">
                          {template.fields.map((field) => (
                            <div key={field.id} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">{field.label}</h4>
                                <div className="flex gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {field.type}
                                  </Badge>
                                  {field.required && (
                                    <Badge variant="destructive" className="text-xs">
                                      Required
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {field.helpText && (
                                <p className="text-sm text-gray-600 mb-2">
                                  {field.helpText}
                                </p>
                              )}
                              {field.placeholder && (
                                <p className="text-xs text-gray-500">
                                  Placeholder: {field.placeholder}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>This template has no customizable fields</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="details" className="mt-6">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Legal Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">Jurisdiction</h4>
                            <p className="text-gray-600">{template.jurisdiction}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">Language</h4>
                            <p className="text-gray-600">{template.language === 'en' ? 'English' : template.language}</p>
                          </div>
                        </div>

                        {template.legalAreas.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Legal Areas</h4>
                            <div className="flex flex-wrap gap-2">
                              {template.legalAreas.map((area) => (
                                <Badge key={area} variant="outline">
                                  {area}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {template.complianceTags.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Compliance</h4>
                            <div className="flex flex-wrap gap-2">
                              {template.complianceTags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-green-700 border-green-300">
                                  <Shield className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Template Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">Version</h4>
                            <p className="text-gray-600">v{template.version}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">Last Updated</h4>
                            <p className="text-gray-600">
                              {template.updatedAt.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="reviews" className="mt-6">
                  <TemplateRating template={template} />
                </TabsContent>

                <TabsContent value="versions" className="mt-6">
                  <TemplateVersionHistory
                    templateId={template.id}
                    currentVersionId={template.id}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Action Card */}
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="text-xl">Get This Template</CardTitle>
                  <CardDescription>
                    Customize and download this template for your needs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {formatPrice(template.priceSgd)}
                    </div>
                    {template.accessLevel === 'public' && (
                      <p className="text-sm text-green-600 mb-4">
                        <CheckCircle className="h-4 w-4 inline mr-1" />
                        Free to use and customize
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={handleCustomize}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Customize Template
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleDownload}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Sample
                    </Button>
                  </div>

                  {template.accessLevel !== 'public' && (
                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        This is a {template.accessLevel} template. 
                        {template.accessLevel === 'premium' ? ' Upgrade to Premium' : ' Contact us'} 
                        {' '}to access all features.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle>What's Included</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Customizable fields</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>PDF download</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Legal compliance checked</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Singapore jurisdiction</span>
                  </div>
                  {template.accessLevel === 'premium' && (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-blue-500" />
                        <span>Word document format</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-blue-500" />
                        <span>Legal review included</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Support */}
              <Card>
                <CardHeader>
                  <CardTitle>Need Help?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Documentation
                  </Button>
                </CardContent>
              </Card>
            </div>
            </div>
          </TemplateAccessGate>
        </div>
      </div>
    </div>
  );
}
