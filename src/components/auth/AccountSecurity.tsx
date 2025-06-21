import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sessionSecurityService, type SessionInfo, type SecurityEvent } from '@/lib/services/sessionSecurity';
import { twoFactorService } from '@/lib/services/twoFactor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Smartphone, 
  Monitor, 
  Tablet, 
  MapPin, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  LogOut
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export const AccountSecurity: React.FC = () => {
  const { user, profile } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAllEvents, setShowAllEvents] = useState(false);

  useEffect(() => {
    if (user) {
      loadSecurityData();
    }
  }, [user]);

  const loadSecurityData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load sessions
      const userSessions = await sessionSecurityService.getUserSessions(user.id);
      setSessions(userSessions);

      // Load security events
      const events = await sessionSecurityService.getSecurityEvents(user.id, 20);
      setSecurityEvents(events);

      // Check 2FA status
      const twoFactorStatus = await twoFactorService.getTwoFactorStatus();
      setTwoFactorEnabled(twoFactorStatus.isEnabled);

    } catch (error) {
      console.error('Error loading security data:', error);
      toast.error('Failed to load security information');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await sessionSecurityService.revokeSession(sessionId);
      toast.success('Session revoked successfully');
      await loadSecurityData();
    } catch (error) {
      console.error('Error revoking session:', error);
      toast.error('Failed to revoke session');
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    if (!user) return;

    try {
      const currentSession = sessions.find(s => s.isCurrentSession);
      if (currentSession) {
        await sessionSecurityService.revokeAllOtherSessions(user.id, currentSession.id);
        toast.success('All other sessions revoked successfully');
        await loadSecurityData();
      }
    } catch (error) {
      console.error('Error revoking sessions:', error);
      toast.error('Failed to revoke other sessions');
    }
  };

  const getDeviceIcon = (deviceType: SessionInfo['deviceType']) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      case 'desktop':
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getEventIcon = (eventType: SecurityEvent['eventType']) => {
    switch (eventType) {
      case 'login':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'logout':
        return <LogOut className="h-4 w-4 text-blue-500" />;
      case 'failed_login':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'password_change':
        return <Shield className="h-4 w-4 text-orange-500" />;
      case '2fa_enabled':
      case '2fa_disabled':
        return <Shield className="h-4 w-4 text-purple-500" />;
      case 'suspicious_activity':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventDescription = (event: SecurityEvent) => {
    switch (event.eventType) {
      case 'login':
        return 'Successful login';
      case 'logout':
        return 'Logged out';
      case 'failed_login':
        return 'Failed login attempt';
      case 'password_change':
        return 'Password changed';
      case '2fa_enabled':
        return 'Two-factor authentication enabled';
      case '2fa_disabled':
        return 'Two-factor authentication disabled';
      case 'suspicious_activity':
        return 'Suspicious activity detected';
      default:
        return 'Security event';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const visibleEvents = showAllEvents ? securityEvents : securityEvents.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Account Security</h2>
        <p className="text-muted-foreground">
          Manage your account security settings and monitor activity
        </p>
      </div>

      {/* Two-Factor Authentication Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {twoFactorEnabled ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">Enabled</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Active
                  </Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-medium">Disabled</span>
                  <Badge variant="destructive">
                    Inactive
                  </Badge>
                </>
              )}
            </div>
            <Button variant={twoFactorEnabled ? "outline" : "default"} size="sm">
              {twoFactorEnabled ? 'Manage 2FA' : 'Enable 2FA'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>
            Devices and locations where you're currently signed in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active sessions found</p>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(session.deviceType)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{session.browser} on {session.os}</span>
                        {session.isCurrentSession && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {session.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {session.location}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last active {formatDistanceToNow(new Date(session.lastActiveAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </div>
                  {!session.isCurrentSession && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeSession(session.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))
            )}
            
            {sessions.length > 1 && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Sign out of all other devices and locations
                  </p>
                  <Button variant="outline" onClick={handleRevokeAllOtherSessions}>
                    Revoke All Other Sessions
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Activity</CardTitle>
          <CardDescription>
            Recent security events on your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {visibleEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent security activity</p>
            ) : (
              visibleEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  {getEventIcon(event.eventType)}
                  <div className="flex-1">
                    <div className="font-medium">{getEventDescription(event)}</div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {securityEvents.length > 5 && (
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllEvents(!showAllEvents)}
                  className="flex items-center gap-2"
                >
                  {showAllEvents ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Show All ({securityEvents.length} events)
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      {!twoFactorEnabled && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Recommendation:</strong> Enable two-factor authentication to add an extra layer of security to your account.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
