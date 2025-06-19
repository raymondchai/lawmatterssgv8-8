import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  FileText,
  Tag,
  SlidersHorizontal,
  Loader2
} from 'lucide-react';
import { documentsApi } from '@/lib/api/documents';
import { combinedSearch, semanticSearch, textSearch } from '@/lib/api/search';
import { DOCUMENT_TYPES, PROCESSING_STATUS } from '@/lib/config/constants';
import type { UploadedDocument } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';
import { debounce } from 'lodash';

const searchSchema = z.object({
  query: z.string().optional(),
  searchType: z.enum(['combined', 'semantic', 'text']).default('combined'),
  documentType: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  minSize: z.number().optional(),
  maxSize: z.number().optional(),
  hasOcr: z.boolean().optional(),
});

type SearchFormData = z.infer<typeof searchSchema>;

interface DocumentSearchProps {
  onResults: (documents: UploadedDocument[]) => void;
  onLoading?: (loading: boolean) => void;
  className?: string;
}

export const DocumentSearch: React.FC<DocumentSearchProps> = ({
  onResults,
  onLoading,
  className = ''
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      hasOcr: false,
    },
  });

  const watchedQuery = watch('query');

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchData: SearchFormData) => {
      if (!searchData.query?.trim() && !hasActiveFilters(searchData)) {
        // If no query and no filters, load all documents
        try {
          setIsSearching(true);
          onLoading?.(true);
          const allDocuments = await documentsApi.getDocuments();
          onResults(allDocuments);
        } catch (error: any) {
          console.error('Error loading documents:', error);
          toast.error('Failed to load documents');
        } finally {
          setIsSearching(false);
          onLoading?.(false);
        }
        return;
      }

      await performSearch(searchData);
    }, 500),
    [onResults, onLoading]
  );

  // Watch for query changes and trigger debounced search
  useEffect(() => {
    const subscription = watch((data) => {
      debouncedSearch(data as SearchFormData);
    });
    return () => subscription.unsubscribe();
  }, [watch, debouncedSearch]);

  const hasActiveFilters = (data: SearchFormData): boolean => {
    return !!(
      data.documentType ||
      data.status ||
      data.dateFrom ||
      data.dateTo ||
      data.minSize ||
      data.maxSize ||
      data.hasOcr
    );
  };

  const performSearch = async (searchData: SearchFormData) => {
    if (!user) {
      toast.error('Please log in to search documents');
      return;
    }

    try {
      setIsSearching(true);
      onLoading?.(true);

      let results: UploadedDocument[] = [];

      if (searchData.query?.trim()) {
        // Add to search history
        const newHistory = [searchData.query, ...searchHistory.filter(h => h !== searchData.query)].slice(0, 5);
        setSearchHistory(newHistory);
        localStorage.setItem('documentSearchHistory', JSON.stringify(newHistory));

        // Perform AI-powered search based on selected type
        const searchType = searchData.searchType || 'combined';

        switch (searchType) {
          case 'semantic':
            const semanticResults = await semanticSearch({
              query: searchData.query,
              userId: user.id,
              maxResults: 20
            });
            results = semanticResults.map(r => r.document).filter(Boolean) as UploadedDocument[];
            break;

          case 'text':
            results = await textSearch({
              query: searchData.query,
              userId: user.id,
              documentType: searchData.documentType,
              dateRange: searchData.dateFrom && searchData.dateTo ? {
                start: new Date(searchData.dateFrom),
                end: new Date(searchData.dateTo)
              } : undefined
            });
            break;

          case 'combined':
          default:
            const combinedResults = await combinedSearch(searchData.query, user.id, {
              documentType: searchData.documentType,
              dateRange: searchData.dateFrom && searchData.dateTo ? {
                start: new Date(searchData.dateFrom),
                end: new Date(searchData.dateTo)
              } : undefined,
              maxResults: 20
            });
            results = combinedResults.textResults;
            break;
        }
      } else {
        // Get all documents for filtering
        results = await documentsApi.getDocuments();
      }

      // Apply additional filters
      results = applyFilters(results, searchData);

      onResults(results);
      updateActiveFilters(searchData);
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
      onLoading?.(false);
    }
  };

  const applyFilters = (documents: UploadedDocument[], filters: SearchFormData): UploadedDocument[] => {
    return documents.filter(doc => {
      // Document type filter
      if (filters.documentType && doc.document_type !== filters.documentType) {
        return false;
      }

      // Status filter
      if (filters.status && doc.processing_status !== filters.status) {
        return false;
      }

      // Date range filter
      if (filters.dateFrom) {
        const docDate = new Date(doc.created_at);
        const fromDate = new Date(filters.dateFrom);
        if (docDate < fromDate) return false;
      }

      if (filters.dateTo) {
        const docDate = new Date(doc.created_at);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (docDate > toDate) return false;
      }

      // File size filter (in KB)
      const fileSizeKB = doc.file_size / 1024;
      if (filters.minSize && fileSizeKB < filters.minSize) {
        return false;
      }
      if (filters.maxSize && fileSizeKB > filters.maxSize) {
        return false;
      }

      // OCR filter
      if (filters.hasOcr && !doc.ocr_text) {
        return false;
      }

      return true;
    });
  };

  const updateActiveFilters = (data: SearchFormData) => {
    const filters: string[] = [];
    
    if (data.documentType) filters.push(`Type: ${DOCUMENT_TYPES[data.documentType as keyof typeof DOCUMENT_TYPES]}`);
    if (data.status) filters.push(`Status: ${PROCESSING_STATUS[data.status as keyof typeof PROCESSING_STATUS]}`);
    if (data.dateFrom) filters.push(`From: ${new Date(data.dateFrom).toLocaleDateString()}`);
    if (data.dateTo) filters.push(`To: ${new Date(data.dateTo).toLocaleDateString()}`);
    if (data.minSize) filters.push(`Min: ${data.minSize}KB`);
    if (data.maxSize) filters.push(`Max: ${data.maxSize}KB`);
    if (data.hasOcr) filters.push('Has OCR text');

    setActiveFilters(filters);
  };

  const clearFilters = () => {
    reset();
    setActiveFilters([]);
    setIsAdvancedOpen(false);
  };

  const removeFilter = (filterToRemove: string) => {
    // This is a simplified implementation - in a real app you'd want more sophisticated filter removal
    clearFilters();
  };

  // Load search history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('documentSearchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Error loading search history:', error);
      }
    }
  }, []);

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Search Documents</CardTitle>
            <CardDescription>
              Find documents by name, content, or metadata
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Search */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              {...register('query')}
              placeholder="Search by filename or content..."
              className="pl-10 pr-10"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>

          {/* Search Type Selector */}
          <div className="flex items-center space-x-2">
            <Label className="text-xs text-gray-500">Search type:</Label>
            <Select onValueChange={(value) => setValue('searchType', value as 'combined' | 'semantic' | 'text')}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Combined" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="combined">Combined</SelectItem>
                <SelectItem value="semantic">AI Semantic</SelectItem>
                <SelectItem value="text">Text Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search History */}
        {searchHistory.length > 0 && !watchedQuery && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500">Recent:</span>
            {searchHistory.map((term, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setValue('query', term)}
              >
                {term}
              </Button>
            ))}
          </div>
        )}

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-500">Active filters:</span>
            {activeFilters.map((filter, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {filter}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => removeFilter(filter)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={clearFilters}
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Advanced Filters */}
        {isAdvancedOpen && (
          <>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Document Type */}
              <div className="space-y-2">
                <Label htmlFor="documentType">Document Type</Label>
                <Select onValueChange={(value) => setValue('documentType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any type</SelectItem>
                    {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Processing Status</Label>
                <Select onValueChange={(value) => setValue('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any status</SelectItem>
                    {Object.entries(PROCESSING_STATUS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Date From</Label>
                <Input
                  {...register('dateFrom')}
                  type="date"
                  className="w-full"
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label htmlFor="dateTo">Date To</Label>
                <Input
                  {...register('dateTo')}
                  type="date"
                  className="w-full"
                />
              </div>

              {/* File Size Range */}
              <div className="space-y-2">
                <Label>File Size (KB)</Label>
                <div className="flex space-x-2">
                  <Input
                    {...register('minSize', { valueAsNumber: true })}
                    type="number"
                    placeholder="Min"
                    className="w-full"
                  />
                  <Input
                    {...register('maxSize', { valueAsNumber: true })}
                    type="number"
                    placeholder="Max"
                    className="w-full"
                  />
                </div>
              </div>

              {/* OCR Filter */}
              <div className="space-y-2">
                <Label>Content Options</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    {...register('hasOcr')}
                    onCheckedChange={(checked) => setValue('hasOcr', !!checked)}
                  />
                  <Label className="text-sm">Has extracted text</Label>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
