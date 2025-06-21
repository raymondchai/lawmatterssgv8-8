import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  BellRing, 
  Check, 
  X, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  ExternalLink
} from 'lucide-react';
import { useSystemNotifications } from '@/hooks/useRealTime';
import { formatDistanceToNow } from 'date-fns';

interface NotificationCenterProps {
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  className = ''
}) => {
  const { notifications, markAsRead, clearAll } = useSystemNotifications();
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getNotificationBadgeVariant = (type: string) => {
    switch (type) {
      case 'success':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0">
            {unreadCount > 0 ? (
              <BellRing className="h-4 w-4" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="end">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <Bell className="h-4 w-4" />
                    <span>Notifications</span>
                  </CardTitle>
                  {unreadCount > 0 && (
                    <CardDescription className="text-xs">
                      {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                    </CardDescription>
                  )}
                </div>
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="text-xs"
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {notifications.length > 0 ? (
                <ScrollArea className="h-80">
                  <div className="space-y-1 p-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          notification.read 
                            ? 'bg-gray-50 border-gray-200' 
                            : 'bg-white border-blue-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-gray-900 mb-1">
                                  {notification.title}
                                </h4>
                                <p className="text-xs text-gray-600 mb-2">
                                  {notification.message}
                                </p>
                                <div className="flex items-center space-x-2">
                                  <Badge 
                                    variant={getNotificationBadgeVariant(notification.type)}
                                    className="text-xs"
                                  >
                                    {notification.type}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {formatDistanceToNow(new Date(notification.created_at), { 
                                      addSuffix: true 
                                    })}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1 ml-2">
                                {!notification.read && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => markAsRead(notification.id)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            {notification.action_url && notification.action_label && (
                              <div className="mt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    window.open(notification.action_url, '_blank');
                                    markAsRead(notification.id);
                                  }}
                                >
                                  {notification.action_label}
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 px-3">
                  <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    No notifications
                  </h3>
                  <p className="text-xs text-gray-500">
                    You're all caught up! New notifications will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// Simplified notification badge for minimal UI
export const NotificationBadge: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  const { notifications } = useSystemNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  if (unreadCount === 0) return null;

  return (
    <Badge 
      variant="destructive" 
      className={`h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center ${className}`}
    >
      {unreadCount > 9 ? '9+' : unreadCount}
    </Badge>
  );
};
