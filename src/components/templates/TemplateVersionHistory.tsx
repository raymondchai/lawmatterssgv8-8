import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  templateVersionManagementService, 
  type TemplateVersion, 
  type TemplateChangeLog 
} from '@/lib/services/templateVersionManagement';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';
import { 
  History, 
  GitBranch, 
  Clock, 
  User, 
  Eye, 
  Download, 
  RotateCcw, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Calendar,
  Tag,
  MessageSquare,
  ArrowRight,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TemplateVersionHistoryProps {
  templateId: string;
  currentVersionId?: string;
  onVersionSelect?: (version: TemplateVersion) => void;
  className?: string;
}

export const TemplateVersionHistory: React.FC<TemplateVersionHistoryProps> = ({
  templateId,
  currentVersionId,
  onVersionSelect,
  className = ''
}) => {
  const { user } = useAuth();
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [changeLog, setChangeLog] = useState<TemplateChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersion | null>(null);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [rollbackReason, setRollbackReason] = useState('');
  const [rollbackLoading, setRollbackLoading] = useState(false);

  useEffect(() => {
    loadVersionHistory();
  }, [templateId]);

  const loadVersionHistory = async () => {
    try {
      setLoading(true);
      const [versionsData, changeLogData] = await Promise.all([
        templateVersionManagementService.getTemplateVersions(templateId),
        templateVersionManagementService.getChangeLog(templateId)
      ]);
      
      setVersions(versionsData);
      setChangeLog(changeLogData);
    } catch (error: any) {
      console.error('Error loading version history:', error);
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (targetVersion: TemplateVersion) => {
    if (!user) {
      toast.error('Please log in to rollback versions');
      return;
    }

    try {
      setRollbackLoading(true);
      
      await templateVersionManagementService.rollbackToVersion(
        templateId,
        targetVersion.id,
        user.id,
        rollbackReason
      );

      toast.success(`Successfully rolled back to version ${targetVersion.versionNumber}`);
      setShowRollbackDialog(false);
      setRollbackReason('');
      loadVersionHistory(); // Reload to show new version
      
    } catch (error: any) {
      console.error('Error rolling back version:', error);
      toast.error('Failed to rollback version: ' + error.message);
    } finally {
      setRollbackLoading(false);
    }
  };

  const getStatusBadge = (version: TemplateVersion) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, label: 'Draft', icon: FileText },
      review: { variant: 'outline' as const, label: 'In Review', icon: Eye },
      published: { variant: 'default' as const, label: 'Published', icon: CheckCircle },
      archived: { variant: 'secondary' as const, label: 'Archived', icon: History },
      deprecated: { variant: 'destructive' as const, label: 'Deprecated', icon: AlertTriangle }
    };

    const config = statusConfig[version.status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getVersionTypeIcon = (version: TemplateVersion) => {
    if (version.breakingChanges) {
      return <Zap className="h-4 w-4 text-red-500" title="Breaking Changes" />;
    }
    if (version.majorVersion > 1) {
      return <Tag className="h-4 w-4 text-blue-500" title="Major Version" />;
    }
    return <GitBranch className="h-4 w-4 text-green-500" title="Minor/Patch Version" />;
  };

  const getChangeTypeIcon = (changeType: string) => {
    const icons = {
      created: <CheckCircle className="h-4 w-4 text-green-500" />,
      updated: <FileText className="h-4 w-4 text-blue-500" />,
      published: <CheckCircle className="h-4 w-4 text-green-500" />,
      archived: <History className="h-4 w-4 text-gray-500" />,
      restored: <RotateCcw className="h-4 w-4 text-orange-500" />,
      deleted: <AlertTriangle className="h-4 w-4 text-red-500" />
    };
    return icons[changeType as keyof typeof icons] || <FileText className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Version List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
          <CardDescription>
            Track changes and manage different versions of this template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {versions.map((version, index) => (
              <div key={version.id} className="relative">
                {index < versions.length - 1 && (
                  <div className="absolute left-6 top-12 bottom-0 w-px bg-gray-200" />
                )}
                
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getVersionTypeIcon(version)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">
                          v{version.versionNumber}
                        </h4>
                        {version.isCurrent && (
                          <Badge variant="outline" className="text-xs">
                            Current
                          </Badge>
                        )}
                        {getStatusBadge(version)}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedVersion(version);
                            onVersionSelect?.(version);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        
                        {!version.isCurrent && version.isPublished && user && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedVersion(version);
                              setShowRollbackDialog(true);
                            }}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Rollback
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {version.changeSummary && (
                      <p className="text-sm text-gray-600 mb-2">
                        {version.changeSummary}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(version.createdAt, { addSuffix: true })}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {version.createdBy}
                      </div>
                      {version.breakingChanges && (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          Breaking Changes
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Change Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Change Log
          </CardTitle>
          <CardDescription>
            Detailed history of all changes made to this template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {changeLog.map((change, index) => (
                <div key={change.id} className="relative">
                  {index < changeLog.length - 1 && (
                    <div className="absolute left-6 top-8 bottom-0 w-px bg-gray-200" />
                  )}
                  
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getChangeTypeIcon(change.changeType)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize">
                          {change.changeType}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(change.createdAt, { addSuffix: true })}
                        </span>
                      </div>
                      
                      {change.changeReason && (
                        <p className="text-sm text-gray-600 mb-1">
                          {change.changeReason}
                        </p>
                      )}
                      
                      <div className="text-xs text-gray-500">
                        by {change.user?.firstName && change.user?.lastName 
                          ? `${change.user.firstName} ${change.user.lastName}`
                          : change.user?.email || 'Unknown'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Rollback Dialog */}
      <Dialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rollback to Version {selectedVersion?.versionNumber}</DialogTitle>
            <DialogDescription>
              This will create a new version based on the selected version. 
              The current version will remain in history.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Rolling back will create a new version. This action cannot be undone.
              </AlertDescription>
            </Alert>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Reason for rollback (optional)
              </label>
              <textarea
                className="w-full p-2 border rounded-md"
                rows={3}
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                placeholder="Explain why you're rolling back to this version..."
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => selectedVersion && handleRollback(selectedVersion)}
                disabled={rollbackLoading}
                className="flex-1"
              >
                {rollbackLoading ? 'Rolling back...' : 'Confirm Rollback'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRollbackDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
