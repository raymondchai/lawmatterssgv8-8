import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { templateMarketplaceService, type Template, type TemplateCategory, type TemplateSearchFilters } from '@/lib/services/templateMarketplace';
import { ROUTES } from '@/lib/config/constants';
import {
  Search,
  Star,
  Download,
  Eye,
  Grid,
  List,
  ChevronDown,
  SlidersHorizontal,
  Briefcase,
  Building,
  Home,
  Users,
  Lightbulb,
  Shield,
  AlertCircle
} from 'lucide-react';

const categoryIcons = {
  employment: Briefcase,
  business: Building,
  property: Home,
  family: Users,
  'intellectual-property': Lightbulb,
  compliance: Shield
};

export default function TemplateBrowser() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [featuredTemplates, setFeaturedTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedAccessLevel, setSelectedAccessLevel] = useState(searchParams.get('access') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'popularity');
  const [minRating, setMinRating] = useState(Number(searchParams.get('rating')) || 0);

  // Pagination
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Handle search parameter changes
  useEffect(() => {
    const filters: TemplateSearchFilters = {
      query: searchQuery || undefined,
      categoryId: selectedCategory || undefined,
      accessLevel: (selectedAccessLevel as any) || undefined,
      sortBy: sortBy as any,
      minRating: minRating || undefined,
      limit: 20,
      offset: 0
    };

    setCurrentOffset(0);
    searchTemplates(filters);
    updateSearchParams();
  }, [searchQuery, selectedCategory, selectedAccessLevel, sortBy, minRating]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [categoriesData, featuredData] = await Promise.all([
        templateMarketplaceService.getCategories(),
        templateMarketplaceService.getFeaturedTemplates(6)
      ]);
      
      setCategories(categoriesData);
      setFeaturedTemplates(featuredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const searchTemplates = async (filters: TemplateSearchFilters) => {
    try {
      setSearchLoading(true);
      const result = await templateMarketplaceService.searchTemplates(filters);
      setTemplates(result.templates);
      setTotal(result.total);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const updateSearchParams = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedAccessLevel) params.set('access', selectedAccessLevel);
    if (sortBy !== 'popularity') params.set('sort', sortBy);
    if (minRating > 0) params.set('rating', minRating.toString());
    setSearchParams(params);
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleLoadMore = async () => {
    if (searchLoading || !hasMore) return;

    try {
      setSearchLoading(true);
      const newOffset = currentOffset + 20;

      const filters: TemplateSearchFilters = {
        query: searchQuery || undefined,
        categoryId: selectedCategory || undefined,
        accessLevel: (selectedAccessLevel as any) || undefined,
        sortBy: sortBy as any,
        minRating: minRating || undefined,
        limit: 20,
        offset: newOffset
      };

      const result = await templateMarketplaceService.searchTemplates(filters);

      // Append new templates to existing ones
      setTemplates(prev => [...prev, ...result.templates]);
      setCurrentOffset(newOffset);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more templates');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleTemplateClick = (template: Template) => {
    // Track template view
    templateMarketplaceService.trackEvent(template.id, 'template_view', {
      source: 'browser',
      category: template.category?.name,
      access_level: template.accessLevel
    });
    
    navigate(`${ROUTES.templatePreview}/${template.slug}`);
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

  const getCategoryIcon = (categorySlug: string) => {
    const IconComponent = categoryIcons[categorySlug as keyof typeof categoryIcons];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            <Skeleton className="h-12 w-full max-w-md mx-auto" />
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={`loading-${i}`} className="h-64 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Legal Document Templates
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Browse our comprehensive collection of Singapore-specific legal document templates.
            Customize, download, and use with confidence.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory || "all"} onValueChange={(value) => setSelectedCategory(value === "all" ? "" : value)}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {safeCategories.map((category) => (
                  category && category.id && category.name ? (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(category.slug)}
                        {category.name}
                      </div>
                    </SelectItem>
                  ) : null
                ))}
              </SelectContent>
            </Select>

            {/* Access Level Filter */}
            <Select value={selectedAccessLevel || "all"} onValueChange={(value) => setSelectedAccessLevel(value === "all" ? "" : value)}>
              <SelectTrigger className="w-full lg:w-32">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="public">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popularity">Most Popular</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <div className="mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-gray-600"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Advanced Filters
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>

            {showFilters && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label htmlFor="min-rating-select" className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Rating
                    </label>
                    <Select value={minRating.toString()} onValueChange={(value) => setMinRating(Number(value))}>
                      <SelectTrigger id="min-rating-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Any Rating</SelectItem>
                        <SelectItem value="3">3+ Stars</SelectItem>
                        <SelectItem value="4">4+ Stars</SelectItem>
                        <SelectItem value="4.5">4.5+ Stars</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Featured Templates */}
        {featuredTemplates.length > 0 && !searchQuery && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured Templates</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredTemplates.map((template) => (
                <Card 
                  key={template.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-blue-200"
                  onClick={() => handleTemplateClick(template)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">{template.title}</CardTitle>
                        <CardDescription className="mt-2 line-clamp-2">
                          {template.description}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                        Featured
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {renderStars(template.ratingAverage)}
                          <span className="text-sm text-gray-600 ml-1">
                            ({template.ratingCount})
                          </span>
                        </div>
                        <span className="font-semibold text-blue-600">
                          {formatPrice(template.priceSgd)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Download className="h-4 w-4" />
                          {template.downloadCount.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          {getCategoryIcon(template.category?.slug || '')}
                          {template.category?.name}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Separator className="mt-12" />
          </div>
        )}

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {searchQuery ? `Search Results for "${searchQuery}"` : 'All Templates'}
            </h2>
            <p className="text-gray-600 mt-1">
              {total.toLocaleString()} templates found
            </p>
          </div>
        </div>

        {/* Templates Grid/List */}
        {searchLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={`search-loading-${i}`} className="h-64 w-full" />
            ))}
          </div>
        ) : templates.length > 0 ? (
          <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {templates.map((template) => (
              <Card 
                key={template.id} 
                className={`cursor-pointer hover:shadow-lg transition-shadow ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
                onClick={() => handleTemplateClick(template)}
              >
                <CardHeader className={viewMode === 'list' ? 'flex-1' : ''}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{template.title}</CardTitle>
                      <CardDescription className="mt-2 line-clamp-2">
                        {template.description}
                      </CardDescription>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="font-semibold text-blue-600">
                        {formatPrice(template.priceSgd)}
                      </div>
                      {template.accessLevel !== 'public' && (
                        <Badge variant="outline" className="mt-1">
                          {template.accessLevel}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className={viewMode === 'list' ? 'flex items-center' : ''}>
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {renderStars(template.ratingAverage)}
                        <span className="text-sm text-gray-600 ml-1">
                          ({template.ratingCount})
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        {template.downloadCount.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1">
                        {getCategoryIcon(template.category?.slug || '')}
                        {template.category?.name}
                      </div>
                    </div>

                    {template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {template.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {template.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {viewMode === 'list' && (
                    <div className="ml-4">
                      <Button size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search criteria or browse all categories.
            </p>
            <Button onClick={() => {
              setSearchQuery('');
              setSelectedCategory('');
              setSelectedAccessLevel('');
              setMinRating(0);
            }}>
              Clear Filters
            </Button>
          </div>
        )}

        {/* Load More */}
        {hasMore && templates.length > 0 && (
          <div className="text-center mt-12">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={searchLoading}
            >
              {searchLoading ? 'Loading...' : 'Load More Templates'}
            </Button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="text-center py-12">
            <div className="text-red-400 mb-4">
              <AlertCircle className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
