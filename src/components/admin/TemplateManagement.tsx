import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { templateMarketplaceService, type Template, type TemplateCategory } from '@/lib/services/templateMarketplace';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Star, 
  Download, 
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export const TemplateManagement: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesData, categoriesData] = await Promise.all([
        templateMarketplaceService.searchTemplates({
          limit: 100,
          sortBy: 'newest'
        }),
        templateMarketplaceService.getCategories()
      ]);
      
      setTemplates(templatesData.templates);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load template data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (templateId: string, currentStatus: boolean) => {
    try {
      // This would need to be implemented in the template service
      // await templateMarketplaceService.updateTemplate(templateId, { isActive: !currentStatus });
      toast.success(`Template ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      loadData();
    } catch (error) {
      toast.error('Failed to update template status');
    }
  };

  const handleToggleFeatured = async (templateId: string, currentFeatured: boolean) => {
    try {
      // This would need to be implemented in the template service
      // await templateMarketplaceService.updateTemplate(templateId, { isFeatured: !currentFeatured });
      toast.success(`Template ${!currentFeatured ? 'featured' : 'unfeatured'} successfully`);
      loadData();
    } catch (error) {
      toast.error('Failed to update template featured status');
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || template.categoryId === selectedCategory;
    
    const matchesStatus = !selectedStatus || 
      (selectedStatus === 'active' && template.isActive) ||
      (selectedStatus === 'inactive' && !template.isActive) ||
      (selectedStatus === 'featured' && template.isFeatured);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (template: Template) => {
    if (!template.isActive) {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>;
    }
    if (template.isFeatured) {
      return <Badge variant="default"><Star className="h-3 w-3 mr-1" />Featured</Badge>;
    }
    return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
  };

  const getAccessLevelBadge = (accessLevel: string) => {
    const variants = {
      public: 'outline',
      premium: 'secondary',
      enterprise: 'default'
    } as const;
    
    return (
      <Badge variant={variants[accessLevel as keyof typeof variants] || 'outline'}>
        {accessLevel.charAt(0).toUpperCase() + accessLevel.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Template Management</h2>
          <p className="text-gray-600">Manage legal document templates and categories</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Create a new legal document template for the marketplace.
              </DialogDescription>
            </DialogHeader>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Template creation interface would be implemented here with form fields for title, description, content, fields, etc.
              </AlertDescription>
            </Alert>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full lg:w-32">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      <div className="space-y-4">
        {filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-600">
                {searchQuery || selectedCategory || selectedStatus 
                  ? 'Try adjusting your filters to see more templates.'
                  : 'Get started by creating your first template.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{template.title}</h3>
                      {getStatusBadge(template)}
                      {getAccessLevelBadge(template.accessLevel)}
                    </div>
                    
                    <p className="text-gray-600 mb-3 line-clamp-2">{template.description}</p>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        {template.downloadCount.toLocaleString()} downloads
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        {template.ratingAverage.toFixed(1)} ({template.ratingCount} reviews)
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(template.createdAt).toLocaleDateString()}
                      </div>
                      {template.priceSgd > 0 && (
                        <div className="font-medium text-green-600">
                          S${template.priceSgd.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleToggleFeatured(template.id, template.isFeatured)}
                    >
                      <Star className={`h-4 w-4 mr-1 ${template.isFeatured ? 'fill-current' : ''}`} />
                      {template.isFeatured ? 'Unfeature' : 'Feature'}
                    </Button>
                    <Button 
                      variant={template.isActive ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleToggleStatus(template.id, template.isActive)}
                    >
                      {template.isActive ? (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{templates.length}</div>
            <div className="text-sm text-gray-600">Total Templates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {templates.filter(t => t.isActive).length}
            </div>
            <div className="text-sm text-gray-600">Active Templates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {templates.filter(t => t.isFeatured).length}
            </div>
            <div className="text-sm text-gray-600">Featured Templates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {templates.reduce((sum, t) => sum + t.downloadCount, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Downloads</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
