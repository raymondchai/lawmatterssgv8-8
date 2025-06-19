import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Share2, 
  Copy, 
  Mail, 
  Eye, 
  Download, 
  MessageSquare, 
  Edit, 
  Clock,
  Users,
  Link,
  Trash2,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  documentSharingService,
  type SharePermissions,
  type DocumentShare,
  type ShareLink
} from '@/lib/services/documentSharing';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface DocumentSharingPanelProps {
  documentId: string;
  documentName: string;
  onShareCreated?: (share: ShareLink) => void;
}

const DocumentSharingPanel: React.FC<DocumentSharingPanelProps> = ({
  documentId,
  documentName,
  onShareCreated
}) => {
  const [shares, setShares] = useState<DocumentShare[]>([]);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareForm, setShareForm] = useState({
    email: '',
    message: '',
    expiresIn: 24, // hours
    permissions: {
      canView: true,
      canDownload: false,
      canComment: false,
      canEdit: false
    } as SharePermissions
  });

  const { toast } = useToast();

  useEffect(() => {
    loadShares();
  }, [documentId]);

  const loadShares = async () => {
    try {
      const documentShares = await documentSharingService.getDocumentShares(documentId);
      setShares(documentShares);
    } catch (error) {
      console.error('Failed to load shares:', error);
    }
  };

  const createShareLink = async () => {
    try {
      setIsCreatingShare(true);

      const shareLink = await documentSharingService.createShareLink(
        documentId,
        shareForm.permissions,
        {
          expiresIn: shareForm.expiresIn,
          shareWithEmail: shareForm.email || undefined,
          message: shareForm.message || undefined
        }
      );

      // Copy to clipboard
      await navigator.clipboard.writeText(shareLink.url);

      toast({
        title: 'Share Link Created',
        description: 'Share link has been copied to clipboard',
      });

      if (onShareCreated) {
        onShareCreated(shareLink);
      }

      // Reset form and close dialog
      setShareForm({
        email: '',
        message: '',
        expiresIn: 24,
        permissions: {
          canView: true,
          canDownload: false,
          canComment: false,
          canEdit: false
        }
      });
      setShareDialogOpen(false);

      // Reload shares
      await loadShares();

    } catch (error) {
      console.error('Failed to create share link:', error);
      toast({
        title: 'Share Failed',
        description: error instanceof Error ? error.message : 'Failed to create share link',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingShare(false);
    }
  };

  const copyShareLink = async (shareToken: string) => {
    const url = `${window.location.origin}/shared/${shareToken}`;
    await navigator.clipboard.writeText(url);
    
    toast({
      title: 'Link Copied',
      description: 'Share link has been copied to clipboard',
    });
  };

  const revokeShare = async (shareId: string) => {
    try {
      await documentSharingService.revokeShare(shareId);
      
      toast({
        title: 'Share Revoked',
        description: 'Share link has been revoked successfully',
      });

      await loadShares();
    } catch (error) {
      console.error('Failed to revoke share:', error);
      toast({
        title: 'Revoke Failed',
        description: error instanceof Error ? error.message : 'Failed to revoke share',
        variant: 'destructive',
      });
    }
  };

  const getPermissionIcon = (permission: keyof SharePermissions) => {
    switch (permission) {
      case 'canView': return <Eye className="h-4 w-4" />;
      case 'canDownload': return <Download className="h-4 w-4" />;
      case 'canComment': return <MessageSquare className="h-4 w-4" />;
      case 'canEdit': return <Edit className="h-4 w-4" />;
      default: return null;
    }
  };

  const getPermissionLabel = (permission: keyof SharePermissions) => {
    switch (permission) {
      case 'canView': return 'View';
      case 'canDownload': return 'Download';
      case 'canComment': return 'Comment';
      case 'canEdit': return 'Edit';
      default: return '';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Share2 className="h-5 w-5 mr-2" />
            Document Sharing
          </div>
          <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Share Document</DialogTitle>
                <DialogDescription>
                  Create a share link for "{documentName}"
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Email (Optional) */}
                <div>
                  <Label htmlFor="email">Share with specific person (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address..."
                    value={shareForm.email}
                    onChange={(e) => setShareForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                {/* Permissions */}
                <div>
                  <Label>Permissions</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {Object.entries(shareForm.permissions).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Switch
                          id={key}
                          checked={value}
                          onCheckedChange={(checked) => 
                            setShareForm(prev => ({
                              ...prev,
                              permissions: { ...prev.permissions, [key]: checked }
                            }))
                          }
                        />
                        <Label htmlFor={key} className="flex items-center space-x-1">
                          {getPermissionIcon(key as keyof SharePermissions)}
                          <span>{getPermissionLabel(key as keyof SharePermissions)}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expiration */}
                <div>
                  <Label htmlFor="expires">Link expires in</Label>
                  <Select
                    value={shareForm.expiresIn.toString()}
                    onValueChange={(value) => 
                      setShareForm(prev => ({ ...prev, expiresIn: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="168">1 week</SelectItem>
                      <SelectItem value="720">1 month</SelectItem>
                      <SelectItem value="0">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Message (Optional) */}
                {shareForm.email && (
                  <div>
                    <Label htmlFor="message">Message (optional)</Label>
                    <Textarea
                      id="message"
                      placeholder="Add a personal message..."
                      value={shareForm.message}
                      onChange={(e) => setShareForm(prev => ({ ...prev, message: e.target.value }))}
                      rows={3}
                    />
                  </div>
                )}

                <Button 
                  onClick={createShareLink}
                  disabled={isCreatingShare}
                  className="w-full"
                >
                  {isCreatingShare ? (
                    'Creating Share Link...'
                  ) : (
                    <>
                      <Link className="h-4 w-4 mr-2" />
                      Create Share Link
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Share this document with others and manage access permissions
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Active Shares</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {shares.filter(share => share.is_active).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Share2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No active shares</p>
                <p className="text-sm">Create a share link to collaborate with others</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shares.filter(share => share.is_active).map((share) => (
                  <Card key={share.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {share.shared_with ? (
                              <Badge variant="outline">
                                <Mail className="h-3 w-3 mr-1" />
                                Private
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <Link className="h-3 w-3 mr-1" />
                                Public
                              </Badge>
                            )}
                            
                            {/* Permission badges */}
                            <div className="flex space-x-1">
                              {Object.entries(share.permissions).map(([key, value]) => 
                                value && (
                                  <Badge key={key} variant="secondary" className="text-xs">
                                    {getPermissionIcon(key as keyof SharePermissions)}
                                    <span className="ml-1">{getPermissionLabel(key as keyof SharePermissions)}</span>
                                  </Badge>
                                )
                              )}
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center space-x-4">
                              <span>Created {formatDistanceToNow(new Date(share.created_at), { addSuffix: true })}</span>
                              {share.expires_at && (
                                <span className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Expires {formatDistanceToNow(new Date(share.expires_at), { addSuffix: true })}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-4">
                              <span>{share.access_count} access{share.access_count !== 1 ? 'es' : ''}</span>
                              {share.last_accessed && (
                                <span>Last accessed {formatDistanceToNow(new Date(share.last_accessed), { addSuffix: true })}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyShareLink(share.share_token)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/shared/${share.share_token}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => revokeShare(share.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <div className="space-y-3">
              {shares.map((share) => (
                <div key={share.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${share.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <p className="text-sm font-medium">
                        {share.shared_with ? 'Private share' : 'Public share'} 
                        {share.is_active ? '' : ' (revoked)'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {share.access_count} access{share.access_count !== 1 ? 'es' : ''} • 
                        Created {formatDistanceToNow(new Date(share.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={share.is_active ? 'default' : 'secondary'}>
                    {share.is_active ? 'Active' : 'Revoked'}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DocumentSharingPanel;
