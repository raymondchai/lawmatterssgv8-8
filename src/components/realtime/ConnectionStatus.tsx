import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Wifi, 
  WifiOff, 
  Users, 
  Circle,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useConnectionStatus, useUserPresence } from '@/hooks/useRealTime';
import type { UserPresence } from '@/lib/services/realTimeService';
import { formatDistanceToNow } from 'date-fns';

interface ConnectionStatusProps {
  documentId?: string;
  showUserPresence?: boolean;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  documentId,
  showUserPresence = false,
  className = ''
}) => {
  const { isConnected, connectionStatus } = useConnectionStatus();
  const { presenceData } = useUserPresence(documentId || '');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBSCRIBED':
      case 'connected':
        return 'bg-green-500';
      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
        return 'bg-red-500';
      case 'CONNECTING':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SUBSCRIBED':
        return 'Connected';
      case 'CHANNEL_ERROR':
        return 'Error';
      case 'TIMED_OUT':
        return 'Timeout';
      case 'CONNECTING':
        return 'Connecting';
      default:
        return 'Disconnected';
    }
  };

  const getUserInitials = (user: UserPresence) => {
    // This would need to be enhanced with actual user data
    return user.user_id.slice(0, 2).toUpperCase();
  };

  const getPresenceStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'away':
        return 'text-yellow-500';
      case 'offline':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  const onlineUsers = presenceData.filter(user => user.status === 'online');
  const awayUsers = presenceData.filter(user => user.status === 'away');

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Connection Status */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <Circle className={`h-2 w-2 ml-1 ${getStatusColor(connectionStatus)}`} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span>Real-time Connection</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge 
                  variant={isConnected ? "default" : "destructive"}
                  className="text-xs"
                >
                  {getStatusText(connectionStatus)}
                </Badge>
              </div>
              
              {!isConnected && (
                <div className="flex items-start space-x-2 p-2 bg-yellow-50 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-xs text-yellow-800">
                    Real-time features may not work properly. Check your internet connection.
                  </div>
                </div>
              )}

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Reconnect
              </Button>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>

      {/* User Presence */}
      {showUserPresence && documentId && presenceData.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Users className="h-4 w-4" />
              <span className="ml-1 text-xs">{onlineUsers.length}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Active Collaborators</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Users currently viewing this document
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Online Users */}
                {onlineUsers.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-900 mb-2">
                      Online ({onlineUsers.length})
                    </h4>
                    <div className="space-y-2">
                      {onlineUsers.map((user) => (
                        <div key={user.user_id} className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getUserInitials(user)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <Circle className="h-2 w-2 text-green-500 fill-current" />
                              <span className="text-xs font-medium truncate">
                                User {user.user_id.slice(-4)}
                              </span>
                            </div>
                            {user.current_page && (
                              <div className="text-xs text-gray-500">
                                Page {user.current_page}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Away Users */}
                {awayUsers.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-900 mb-2">
                      Away ({awayUsers.length})
                    </h4>
                    <div className="space-y-2">
                      {awayUsers.map((user) => (
                        <div key={user.user_id} className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getUserInitials(user)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <Circle className="h-2 w-2 text-yellow-500 fill-current" />
                              <span className="text-xs font-medium truncate">
                                User {user.user_id.slice(-4)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Last seen {formatDistanceToNow(new Date(user.last_seen), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {presenceData.length === 0 && (
                  <div className="text-center py-4">
                    <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No other users online</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

// Simplified connection indicator for minimal UI
export const ConnectionIndicator: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  const { isConnected } = useConnectionStatus();

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <Circle 
        className={`h-2 w-2 ${
          isConnected ? 'text-green-500 fill-current' : 'text-red-500 fill-current'
        }`} 
      />
      <span className="text-xs text-gray-600">
        {isConnected ? 'Live' : 'Offline'}
      </span>
    </div>
  );
};
