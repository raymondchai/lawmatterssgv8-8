import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  FileText,
  Eye,
  Download,
  Copy,
  Calendar,
  User,
  Grid,
  List
} from 'lucide-react';
import { templatesApi } from '@/lib/api/templates';
import type { Template } from '@/types';
import { toast } from '@/components/ui/sonner';
import { formatDistanceToNow } from 'date-fns';

// Add line-clamp utility classes
const lineClampStyles = `
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

interface TemplateBrowserProps {
  onTemplateSelect?: (template: Template) => void;
  onTemplatePreview?: (template: Template) => void;
  className?: string;
}

const TEMPLATE_CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'contracts', label: 'Contracts & Agreements' },
  { value: 'employment', label: 'Employment Law' },
  { value: 'corporate', label: 'Corporate Documents' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'intellectual-property', label: 'Intellectual Property' },
  { value: 'litigation', label: 'Litigation & Court' },
  { value: 'compliance', label: 'Compliance & Regulatory' },
  { value: 'personal', label: 'Personal Legal' },
  { value: 'other', label: 'Other' }
];

export const TemplateBrowser: React.FC<TemplateBrowserProps> = ({
  onTemplateSelect,
  onTemplatePreview,
  className = ''
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory, sortBy]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await templatesApi.getPublicTemplates();
      setTemplates(data);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    setFilteredTemplates(filtered);
  };

  const handleTemplateAction = (template: Template, action: 'select' | 'preview' | 'copy') => {
    switch (action) {
      case 'select':
        onTemplateSelect?.(template);
        break;
      case 'preview':
        onTemplatePreview?.(template);
        break;
      case 'copy':
        navigator.clipboard.writeText(template.content);
        toast.success('Template content copied to clipboard');
        break;
    }
  };

  const getCategoryLabel = (category: string) => {
    const categoryObj = TEMPLATE_CATEGORIES.find(cat => cat.value === category);
    return categoryObj?.label || category;
  };

  const TemplateCard: React.FC<{ template: Template }> = ({ template }) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">
              {template.name}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {template.description}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="ml-2 flex-shrink-0">
            {getCategoryLabel(template.category)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Template preview */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700 line-clamp-3">
              {template.content.substring(0, 150)}...
            </p>
          </div>

          {/* Variables */}
          {template.variables && template.variables.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Variables:</p>
              <div className="flex flex-wrap gap-1">
                {template.variables.slice(0, 3).map((variable, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {variable}
                  </Badge>
                ))}
                {template.variables.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{template.variables.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDistanceToNow(new Date(template.created_at), { addSuffix: true })}</span>
            </div>
            <div className="flex items-center space-x-1">
              <User className="h-3 w-3" />
              <span>Public</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleTemplateAction(template, 'preview')}
            >
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTemplateAction(template, 'copy')}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => handleTemplateAction(template, 'select')}
            >
              <Download className="h-4 w-4 mr-1" />
              Use
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const TemplateListItem: React.FC<{ template: Template }> = ({ template }) => (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium truncate">{template.name}</h3>
                <p className="text-sm text-gray-500 truncate">{template.description}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="text-xs">
              {getCategoryLabel(template.category)}
            </Badge>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(template.created_at), { addSuffix: true })}
            </span>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTemplateAction(template, 'preview')}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTemplateAction(template, 'copy')}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => handleTemplateAction(template, 'select')}
              >
                Use
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Legal Templates</h2>
          <p className="text-gray-600">
            Browse and customize professional legal document templates
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="w-full md:w-64">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="w-full md:w-48">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            {loading ? 'Loading...' : `${filteredTemplates.length} template${filteredTemplates.length === 1 ? '' : 's'} found`}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTemplates.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTemplates.map((template) => (
                <TemplateListItem key={template.id} template={template} />
              ))}
            </div>
          )
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-500">
                Try adjusting your search criteria or browse different categories.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
