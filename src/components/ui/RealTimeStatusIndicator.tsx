import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Wifi,
  WifiOff,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Bell,
  X
} from 'lucide-react';
import { useRealTime } from '@/hooks/useRealTimeUpdates';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface RealTimeStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const RealTimeStatusIndicator: React.FC<RealTimeStatusIndicatorProps> = ({
  className = '',
  showDetails = false
}) => {
  const { status, documentProcessing, aiQueries, notifications } = useRealTime({
    enableNotifications: true
  });

  const getStatusIcon = () => {
    if (!status.isConnected) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
    
    if (documentProcessing.isProcessing || aiQueries.isProcessing) {
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    }
    
    return <Wifi className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!status.isConnected) {
      return 'Disconnected';
    }
    
    if (documentProcessing.isProcessing) {
      return 'Processing documents...';
    }
    
    if (aiQueries.isProcessing) {
      return 'AI query in progress...';
    }
    
    return 'Connected';
  };

  const getStatusColor = () => {
    if (!status.isConnected) return 'destructive';
    if (documentProcessing.isProcessing || aiQueries.isProcessing) return 'default';
    return 'secondary';
  };

  if (!showDetails) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        {getStatusIcon()}
        <Badge variant={getStatusColor()} className="text-xs">
          {getStatusText()}
        </Badge>
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={cn('flex items-center space-x-2', className)}>
          {getStatusIcon()}
          <span className="text-sm">{getStatusText()}</span>
          {notifications.notifications.length > 0 && (
            <Badge variant="destructive" className="h-5 w-5 p-0 text-xs">
              {notifications.notifications.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          {/* Connection Status */}
          <div>
            <h4 className="font-medium text-sm mb-2">Connection Status</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className="text-sm">{status.connectionState}</span>
              </div>
              {status.lastUpdate && (
                <span className="text-xs text-muted-foreground">
                  Last update: {formatDistanceToNow(new Date(status.lastUpdate), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>

          <Separator />

          {/* Document Processing Status */}
          {Object.keys(documentProcessing.processingStates).length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">Document Processing</h4>
              <ScrollArea className="max-h-32">
                <div className="space-y-2">
                  {Object.entries(documentProcessing.processingStates).map(([docId, state]) => (
                    <div key={docId} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium truncate" title={docId}>
                          {docId.slice(0, 8)}...
                        </span>
                        <div className="flex items-center space-x-1">
                          {state.status === 'completed' && <CheckCircle className="h-3 w-3 text-green-500" />}
                          {state.status === 'failed' && <XCircle className="h-3 w-3 text-red-500" />}
                          {['uploading', 'processing', 'analyzing'].includes(state.status) && (
                            <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                          )}
                          <Badge variant="outline" className="text-xs">
                            {state.status}
                          </Badge>
                        </div>
                      </div>
                      <Progress value={state.progress} className="h-1" />
                      <p className="text-xs text-muted-foreground">{state.message}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* AI Query Status */}
          {Object.keys(aiQueries.queryStates).length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">AI Queries</h4>
              <ScrollArea className="max-h-32">
                <div className="space-y-2">
                  {Object.entries(aiQueries.queryStates).map(([queryId, state]) => (
                    <div key={queryId} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium truncate" title={queryId}>
                          Query {queryId.slice(0, 8)}...
                        </span>
                        <div className="flex items-center space-x-1">
                          {state.status === 'completed' && <CheckCircle className="h-3 w-3 text-green-500" />}
                          {state.status === 'failed' && <XCircle className="h-3 w-3 text-red-500" />}
                          {state.status === 'processing' && (
                            <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                          )}
                          <Badge variant="outline" className="text-xs">
                            {state.status}
                          </Badge>
                        </div>
                      </div>
                      <Progress value={state.progress} className="h-1" />
                      <p className="text-xs text-muted-foreground">{state.message}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* System Notifications */}
          {notifications.notifications.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">Notifications</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={notifications.clearAllNotifications}
                  className="text-xs"
                >
                  Clear all
                </Button>
              </div>
              <ScrollArea className="max-h-40">
                <div className="space-y-2">
                  {notifications.notifications.map((notification) => (
                    <Card key={notification.id} className="p-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2 flex-1">
                          <div className="mt-0.5">
                            {notification.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {notification.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                            {notification.type === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                            {notification.type === 'info' && <Bell className="h-4 w-4 text-blue-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="text-xs text-muted-foreground">{notification.message}</p>
                            {notification.action && (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto text-xs"
                                onClick={() => window.open(notification.action!.url, '_blank')}
                              >
                                {notification.action.label}
                              </Button>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => notifications.dismissNotification(notification.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Empty State */}
          {Object.keys(documentProcessing.processingStates).length === 0 &&
           Object.keys(aiQueries.queryStates).length === 0 &&
           notifications.notifications.length === 0 && (
            <div className="text-center py-4">
              <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No active processes</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface DocumentProcessingIndicatorProps {
  documentId: string;
  className?: string;
}

export const DocumentProcessingIndicator: React.FC<DocumentProcessingIndicatorProps> = ({
  documentId,
  className = ''
}) => {
  const { documentProcessing } = useRealTime({ documentId });
  const state = documentProcessing.getDocumentState(documentId);

  if (!state) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {state.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
          {state.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
          {['uploading', 'processing', 'analyzing'].includes(state.status) && (
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          )}
          <span className="text-sm font-medium">{state.message}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {state.progress}%
        </Badge>
      </div>
      <Progress value={state.progress} className="h-2" />
      {state.stage && (
        <p className="text-xs text-muted-foreground">Stage: {state.stage}</p>
      )}
      {state.error && (
        <p className="text-xs text-red-600">Error: {state.error}</p>
      )}
    </div>
  );
};
