import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Eye, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  MoreHorizontal,
  Upload,
  BarChart3,
  Grid,
  List
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  useDocuments, 
  useDocumentSearch, 
  useDocumentDeletion, 
  useDocumentDownload,
  useBulkDocumentOperations,
  useDocumentStats
} from '@/hooks/useDocumentProcessing';
import { DOCUMENT_TYPES, PROCESSING_STATUS } from '@/lib/config/constants';
import { formatDistanceToNow } from 'date-fns';
import type { UploadedDocument } from '@/types';
import EnhancedDocumentUpload from './EnhancedDocumentUpload';

type ViewMode = 'grid' | 'list';
type SortField = 'created_at' | 'filename' | 'file_size' | 'processing_status';
type SortOrder = 'asc' | 'desc';

interface DocumentFilters {
  status: string;
  type: string;
  dateRange: string;
}

const DocumentManagementDashboard: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filters, setFilters] = useState<DocumentFilters>({
    status: 'all',
    type: 'all',
    dateRange: 'all'
  });
  const [showUpload, setShowUpload] = useState(false);

  // Hooks
  const { data: documents = [], isLoading, error } = useDocuments();
  const { searchQuery, setSearchQuery, searchResults, isSearching } = useDocumentSearch();
  const deleteDocument = useDocumentDeletion();
  const downloadDocument = useDocumentDownload();
  const { bulkDelete, isBulkDeleting } = useBulkDocumentOperations();
  const { data: stats } = useDocumentStats();

  // Filtered and sorted documents
  const filteredDocuments = useMemo(() => {
    let result = searchQuery.length > 2 ? searchResults : documents;

    // Apply filters
    if (filters.status !== 'all') {
      result = result.filter(doc => doc.processing_status === filters.status);
    }
    if (filters.type !== 'all') {
      result = result.filter(doc => doc.document_type === filters.type);
    }
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      switch (filters.dateRange) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(now.getMonth() - 1);
          break;
      }
      result = result.filter(doc => new Date(doc.created_at) >= cutoff);
    }

    // Sort documents
    result.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortField === 'file_size') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return result;
  }, [documents, searchResults, searchQuery, filters, sortField, sortOrder]);

  // Selection handlers
  const toggleDocumentSelection = (documentId: string) => {
    const newSelection = new Set(selectedDocuments);
    if (newSelection.has(documentId)) {
      newSelection.delete(documentId);
    } else {
      newSelection.add(documentId);
    }
    setSelectedDocuments(newSelection);
  };

  const selectAllDocuments = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map(doc => doc.id)));
    }
  };

  // Action handlers
  const handleBulkDelete = async () => {
    if (selectedDocuments.size === 0) return;
    
    await bulkDelete.mutateAsync(Array.from(selectedDocuments));
    setSelectedDocuments(new Set());
  };

  const handleDownload = (documentId: string) => {
    downloadDocument.mutate({ documentId });
  };

  const handleDelete = (documentId: string) => {
    deleteDocument.mutate(documentId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (showUpload) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Upload Documents</h2>
          <Button variant="outline" onClick={() => setShowUpload(false)}>
            Back to Dashboard
          </Button>
        </div>
        <EnhancedDocumentUpload 
          onUploadComplete={() => setShowUpload(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Document Management</h2>
          <p className="text-gray-600">
            Manage and organize your legal documents
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Documents
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Documents</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Processed</p>
                  <p className="text-2xl font-bold">{stats.byStatus.completed || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Processing</p>
                  <p className="text-2xl font-bold">{stats.byStatus.processing || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Size</p>
                  <p className="text-2xl font-bold">
                    {(stats.totalSize / 1024 / 1024).toFixed(1)}MB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(PROCESSING_STATUS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.type}
                onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={sortField}
                onValueChange={(value) => setSortField(value as SortField)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date</SelectItem>
                  <SelectItem value="filename">Name</SelectItem>
                  <SelectItem value="file_size">Size</SelectItem>
                  <SelectItem value="processing_status">Status</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>

            {/* View Mode */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedDocuments.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedDocuments.size} document{selectedDocuments.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDocuments(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document List/Grid */}
      {isLoading ? (
        <div className="text-center py-8">
          <p>Loading documents...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">
          <p>Error loading documents: {error.message}</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {searchQuery ? 'No documents found matching your search.' : 'No documents uploaded yet.'}
          </p>
          {!searchQuery && (
            <Button className="mt-4" onClick={() => setShowUpload(true)}>
              Upload Your First Document
            </Button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'space-y-2'
        }>
          {/* Select All Checkbox (List View) */}
          {viewMode === 'list' && (
            <div className="flex items-center space-x-3 p-3 border-b">
              <Checkbox
                checked={selectedDocuments.size === filteredDocuments.length}
                onCheckedChange={selectAllDocuments}
              />
              <span className="text-sm font-medium">Select All</span>
            </div>
          )}

          {filteredDocuments.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              viewMode={viewMode}
              isSelected={selectedDocuments.has(document.id)}
              onToggleSelection={() => toggleDocumentSelection(document.id)}
              onDownload={() => handleDownload(document.id)}
              onDelete={() => handleDelete(document.id)}
              getStatusIcon={getStatusIcon}
              getStatusColor={getStatusColor}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Document Card Component
interface DocumentCardProps {
  document: UploadedDocument;
  viewMode: ViewMode;
  isSelected: boolean;
  onToggleSelection: () => void;
  onDownload: () => void;
  onDelete: () => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusColor: (status: string) => string;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  viewMode,
  isSelected,
  onToggleSelection,
  onDownload,
  onDelete,
  getStatusIcon,
  getStatusColor
}) => {
  if (viewMode === 'list') {
    return (
      <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelection}
        />
        <FileText className="h-5 w-5 text-gray-400" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{document.filename}</p>
          <p className="text-sm text-gray-500">
            {DOCUMENT_TYPES[document.document_type as keyof typeof DOCUMENT_TYPES]} • 
            {(document.file_size / 1024 / 1024).toFixed(2)} MB • 
            {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(document.processing_status)}>
            {getStatusIcon(document.processing_status)}
            <span className="ml-1">{PROCESSING_STATUS[document.processing_status as keyof typeof PROCESSING_STATUS]}</span>
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <Card className={`cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelection}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="text-center mb-4">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <h3 className="font-medium truncate" title={document.filename}>
            {document.filename}
          </h3>
        </div>
        
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Type:</span>
            <span>{DOCUMENT_TYPES[document.document_type as keyof typeof DOCUMENT_TYPES]}</span>
          </div>
          <div className="flex justify-between">
            <span>Size:</span>
            <span>{(document.file_size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <div className="flex justify-between">
            <span>Uploaded:</span>
            <span>{formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}</span>
          </div>
        </div>
        
        <div className="mt-3">
          <Badge className={`w-full justify-center ${getStatusColor(document.processing_status)}`}>
            {getStatusIcon(document.processing_status)}
            <span className="ml-1">{PROCESSING_STATUS[document.processing_status as keyof typeof PROCESSING_STATUS]}</span>
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentManagementDashboard;
