import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Download, 
  Eye, 
  MessageSquare, 
  Share2, 
  FileText, 
  User,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { 
  documentSharingService,
  type DocumentShare,
  type SharePermissions,
  type DocumentComment
} from '@/lib/services/documentSharing';
import { documentExportService } from '@/lib/services/documentExport';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import type { UploadedDocument } from '@/types';

const SharedDocument: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<UploadedDocument | null>(null);
  const [permissions, setPermissions] = useState<SharePermissions | null>(null);
  const [share, setShare] = useState<DocumentShare | null>(null);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (shareToken) {
      loadSharedDocument();
    }
  }, [shareToken]);

  const loadSharedDocument = async () => {
    if (!shareToken) return;

    try {
      setLoading(true);
      setError(null);

      const result = await documentSharingService.accessSharedDocument(shareToken);
      
      setDocument(result.document);
      setPermissions(result.permissions);
      setShare(result.share);

      // Load comments if user can comment
      if (result.permissions.canComment) {
        await loadComments(result.document.id);
      }

    } catch (err) {
      console.error('Failed to load shared document:', err);
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (documentId: string) => {
    try {
      const documentComments = await documentSharingService.getDocumentComments(documentId);
      setComments(documentComments);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const handleDownload = async () => {
    if (!document || !permissions?.canDownload) return;

    try {
      setIsDownloading(true);

      const result = await documentExportService.downloadDocument(document.id, {
        format: 'pdf',
        includeAnalysis: false
      });

      // Create download link
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download Started',
        description: `Downloading ${result.filename}`,
      });

    } catch (err) {
      console.error('Download failed:', err);
      toast({
        title: 'Download Failed',
        description: err instanceof Error ? err.message : 'Failed to download document',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAddComment = async () => {
    if (!document || !newComment.trim() || !permissions?.canComment) return;

    try {
      setIsAddingComment(true);

      await documentSharingService.addComment(document.id, newComment.trim());
      setNewComment('');
      
      // Reload comments
      await loadComments(document.id);

      toast({
        title: 'Comment Added',
        description: 'Your comment has been added successfully',
      });

    } catch (err) {
      console.error('Failed to add comment:', err);
      toast({
        title: 'Comment Failed',
        description: err instanceof Error ? err.message : 'Failed to add comment',
        variant: 'destructive',
      });
    } finally {
      setIsAddingComment(false);
    }
  };

  const getPermissionBadges = () => {
    if (!permissions) return null;

    const activePerm = Object.entries(permissions)
      .filter(([key, value]) => value && key !== 'expiresAt')
      .map(([key]) => {
        switch (key) {
          case 'canView': return { icon: <Eye className="h-3 w-3" />, label: 'View' };
          case 'canDownload': return { icon: <Download className="h-3 w-3" />, label: 'Download' };
          case 'canComment': return { icon: <MessageSquare className="h-3 w-3" />, label: 'Comment' };
          case 'canEdit': return { icon: <FileText className="h-3 w-3" />, label: 'Edit' };
          default: return null;
        }
      })
      .filter(Boolean);

    return (
      <div className="flex flex-wrap gap-2">
        {activePerm.map((perm, index) => (
          <Badge key={index} variant="outline" className="flex items-center space-x-1">
            {perm?.icon}
            <span>{perm?.label}</span>
          </Badge>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading shared document...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                <h2 className="text-xl font-semibold">Access Denied</h2>
                <p className="text-gray-600">{error}</p>
                <Button onClick={() => navigate('/')}>
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (!document || !permissions || !share) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Share2 className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold">Shared Document</h1>
            </div>
            {permissions.canDownload && (
              <Button onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </>
                )}
              </Button>
            )}
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{document.filename}</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Shared by {share.shared_by_user?.email || 'Unknown'}</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(share.created_at), { addSuffix: true })}</span>
              {share.expires_at && (
                <>
                  <span>•</span>
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Expires {formatDistanceToNow(new Date(share.expires_at), { addSuffix: true })}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Your permissions:</span>
              {getPermissionBadges()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Document Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Document Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                {document.ocr_text ? (
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                      {document.ocr_text}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Document content is not available for preview</p>
                    {permissions.canDownload && (
                      <p className="text-sm">Download the document to view its contents</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Document Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Document Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Type:</span>
                  <span className="text-sm font-medium">{document.document_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Size:</span>
                  <span className="text-sm font-medium">
                    {(document.file_size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Uploaded:</span>
                  <span className="text-sm font-medium">
                    {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge variant={document.processing_status === 'completed' ? 'default' : 'secondary'}>
                    {document.processing_status}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Comments */}
            {permissions.canComment && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Comments ({comments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Comment */}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                    />
                    <Button 
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || isAddingComment}
                      size="sm"
                      className="w-full"
                    >
                      {isAddingComment ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Add Comment
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="p-3 border rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">
                            {comment.user?.first_name || comment.user?.email || 'Anonymous'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SharedDocument;
