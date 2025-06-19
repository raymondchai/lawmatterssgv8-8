import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  FileText, 
  Eye, 
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { documentsApi } from '@/lib/api/documents';
import { PROCESSING_STATUS } from '@/lib/config/constants';
import type { UploadedDocument } from '@/types';
import { toast } from '@/components/ui/sonner';
import { formatDistanceToNow } from 'date-fns';

interface DocumentStatusTrackerProps {
  onDocumentSelect?: (document: UploadedDocument) => void;
  refreshTrigger?: number;
  className?: string;
}

interface ProcessingStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export const DocumentStatusTracker: React.FC<DocumentStatusTrackerProps> = ({
  onDocumentSelect,
  refreshTrigger,
  className = ''
}) => {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [stats, setStats] = useState<ProcessingStats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  });
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [refreshTrigger]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh) {
      // Auto-refresh every 30 seconds if there are processing documents
      interval = setInterval(() => {
        if (stats.processing > 0 || stats.pending > 0) {
          loadDocuments();
        }
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, stats.processing, stats.pending]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const allDocuments = await documentsApi.getDocuments();
      
      // Sort by creation date, newest first
      const sortedDocs = allDocuments.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setDocuments(sortedDocs);
      calculateStats(sortedDocs);
    } catch (error: any) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load document status');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (docs: UploadedDocument[]) => {
    const newStats = docs.reduce((acc, doc) => {
      acc.total++;
      switch (doc.processing_status) {
        case 'pending':
          acc.pending++;
          break;
        case 'processing':
          acc.processing++;
          break;
        case 'completed':
          acc.completed++;
          break;
        case 'failed':
          acc.failed++;
          break;
      }
      return acc;
    }, {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    });

    setStats(newStats);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressPercentage = () => {
    if (stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  };

  const getActiveDocuments = () => {
    return documents.filter(doc => 
      doc.processing_status === 'pending' || doc.processing_status === 'processing'
    ).slice(0, 5); // Show only first 5 active documents
  };

  const getRecentCompletedDocuments = () => {
    return documents.filter(doc => doc.processing_status === 'completed').slice(0, 3);
  };

  const getFailedDocuments = () => {
    return documents.filter(doc => doc.processing_status === 'failed');
  };

  if (loading && documents.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Processing Status</CardTitle>
            <CardDescription>
              Real-time document processing status and progress
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-green-50' : ''}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto-refresh
            </Button>
            <Button onClick={loadDocuments} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Overall Progress</h4>
            <span className="text-sm text-gray-500">
              {stats.completed} of {stats.total} completed
            </span>
          </div>
          <Progress value={getProgressPercentage()} className="w-full" />
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
              <div className="text-xs text-gray-500">Processing</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-xs text-gray-500">Failed</div>
            </div>
          </div>
        </div>

        {/* Active Processing */}
        {getActiveDocuments().length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Currently Processing
            </h4>
            <div className="space-y-2">
              {getActiveDocuments().map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getStatusIcon(document.processing_status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {document.filename}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(document.processing_status)}>
                      {PROCESSING_STATUS[document.processing_status as keyof typeof PROCESSING_STATUS]}
                    </Badge>
                    {onDocumentSelect && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDocumentSelect(document)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recently Completed */}
        {getRecentCompletedDocuments().length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Recently Completed
            </h4>
            <div className="space-y-2">
              {getRecentCompletedDocuments().map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-2 border rounded-lg bg-green-50"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {document.filename}
                      </p>
                      <p className="text-xs text-gray-500">
                        Completed {formatDistanceToNow(new Date(document.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  {onDocumentSelect && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDocumentSelect(document)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Failed Documents */}
        {getFailedDocuments().length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center text-red-600">
              <AlertCircle className="h-4 w-4 mr-2" />
              Failed Processing ({getFailedDocuments().length})
            </h4>
            <div className="space-y-2">
              {getFailedDocuments().slice(0, 3).map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-2 border rounded-lg bg-red-50"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {document.filename}
                      </p>
                      <p className="text-xs text-red-600">
                        Processing failed
                      </p>
                    </div>
                  </div>
                  {onDocumentSelect && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDocumentSelect(document)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats.total === 0 && (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No documents yet
            </h3>
            <p className="text-gray-500">
              Upload your first document to start tracking processing status
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
