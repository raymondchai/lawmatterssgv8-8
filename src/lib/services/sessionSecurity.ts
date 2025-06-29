import { supabase } from '@/lib/supabase';
import { config } from '@/lib/config/env';

export interface SessionInfo {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  isCurrentSession: boolean;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

export interface SecurityEvent {
  id: string;
  userId: string;
  eventType: 'login' | 'logout' | 'failed_login' | 'password_change' | '2fa_enabled' | '2fa_disabled' | 'suspicious_activity';
  ipAddress: string;
  userAgent: string;
  location?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface LoginAttempt {
  ipAddress: string;
  attempts: number;
  lastAttempt: string;
  blockedUntil?: string;
}

class SessionSecurityService {
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private readonly SUSPICIOUS_ACTIVITY_THRESHOLD = 10;

  /**
   * Track user session information
   */
  async trackSession(sessionId: string, userId: string): Promise<void> {
    try {
      const sessionInfo = await this.getSessionInfo();
      
      const { error } = await supabase
        .from('user_sessions')
        .upsert({
          id: sessionId,
          user_id: userId,
          ip_address: sessionInfo.ipAddress,
          user_agent: sessionInfo.userAgent,
          device_type: sessionInfo.deviceType,
          browser: sessionInfo.browser,
          os: sessionInfo.os,
          location: sessionInfo.location,
          last_active_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + this.SESSION_TIMEOUT).toISOString()
        });

      if (error) {
        console.error('Error tracking session:', error);
      }
    } catch (error) {
      console.error('Error in trackSession:', error);
    }
  }

  /**
   * Get current session information
   */
  private async getSessionInfo(): Promise<Partial<SessionInfo>> {
    const userAgent = navigator.userAgent;
    const ipAddress = await this.getUserIP();
    
    return {
      ipAddress,
      userAgent,
      deviceType: this.getDeviceType(userAgent),
      browser: this.getBrowser(userAgent),
      os: this.getOS(userAgent),
      location: await this.getLocation(ipAddress)
    };
  }

  /**
   * Get user's IP address
   */
  private async getUserIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error getting IP address:', error);
      return 'unknown';
    }
  }

  /**
   * Get device type from user agent
   */
  private getDeviceType(userAgent: string): SessionInfo['deviceType'] {
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return /iPad/.test(userAgent) ? 'tablet' : 'mobile';
    }
    return 'desktop';
  }

  /**
   * Get browser from user agent
   */
  private getBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  /**
   * Get OS from user agent
   */
  private getOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  /**
   * Get approximate location from IP
   */
  private async getLocation(ipAddress: string): Promise<string | undefined> {
    try {
      // Using a free IP geolocation service
      const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
      const data = await response.json();
      
      if (data.city && data.country_name) {
        return `${data.city}, ${data.country_name}`;
      }
      return data.country_name || undefined;
    } catch (error) {
      console.error('Error getting location:', error);
      return undefined;
    }
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    eventType: SecurityEvent['eventType'],
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sessionInfo = await this.getSessionInfo();

      const { error } = await supabase
        .from('security_events')
        .insert({
          user_id: user.id,
          event_type: eventType,
          ip_address: sessionInfo.ipAddress,
          user_agent: sessionInfo.userAgent,
          location: sessionInfo.location,
          metadata: metadata || {}
        });

      if (error) {
        console.error('Error logging security event:', error);
      }
    } catch (error) {
      console.error('Error in logSecurityEvent:', error);
    }
  }

  /**
   * Check for suspicious login activity
   */
  async checkSuspiciousActivity(ipAddress: string, userId?: string): Promise<boolean> {
    try {
      // Check failed login attempts from this IP
      const { data: failedAttempts, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('ip_address', ipAddress)
        .eq('event_type', 'failed_login')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error checking suspicious activity:', error);
        return false;
      }

      // If more than threshold failed attempts, it's suspicious
      if (failedAttempts && failedAttempts.length >= this.SUSPICIOUS_ACTIVITY_THRESHOLD) {
        return true;
      }

      // Check for multiple different locations for the same user
      if (userId) {
        const { data: recentLogins } = await supabase
          .from('security_events')
          .select('location')
          .eq('user_id', userId)
          .eq('event_type', 'login')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
          .not('location', 'is', null);

        if (recentLogins) {
          const uniqueLocations = new Set(recentLogins.map(l => l.location));
          if (uniqueLocations.size > 3) { // More than 3 different locations in 24h
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Error in checkSuspiciousActivity:', error);
      return false;
    }
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('last_active_at', { ascending: false });

      if (error) {
        console.error('Error getting user sessions:', error);
        return [];
      }

      const currentSession = await supabase.auth.getSession();
      const currentSessionId = currentSession.data.session?.access_token;

      return (data || []).map(session => ({
        id: session.id,
        userId: session.user_id,
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        location: session.location,
        deviceType: session.device_type,
        browser: session.browser,
        os: session.os,
        isCurrentSession: session.id === currentSessionId,
        createdAt: session.created_at,
        lastActiveAt: session.last_active_at,
        expiresAt: session.expires_at
      }));
    } catch (error) {
      console.error('Error in getUserSessions:', error);
      return [];
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        console.error('Error revoking session:', error);
        throw new Error('Failed to revoke session');
      }
    } catch (error) {
      console.error('Error in revokeSession:', error);
      throw error;
    }
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', userId)
        .neq('id', currentSessionId);

      if (error) {
        console.error('Error revoking other sessions:', error);
        throw new Error('Failed to revoke other sessions');
      }

      await this.logSecurityEvent('logout', {
        action: 'revoke_all_sessions',
        sessions_revoked: 'all_others'
      });
    } catch (error) {
      console.error('Error in revokeAllOtherSessions:', error);
      throw error;
    }
  }

  /**
   * Get security events for user
   */
  async getSecurityEvents(userId: string, limit: number = 50): Promise<SecurityEvent[]> {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting security events:', error);
        return [];
      }

      return (data || []).map(event => ({
        id: event.id,
        userId: event.user_id,
        eventType: event.event_type,
        ipAddress: event.ip_address,
        userAgent: event.user_agent,
        location: event.location,
        metadata: event.metadata,
        createdAt: event.created_at
      }));
    } catch (error) {
      console.error('Error in getSecurityEvents:', error);
      return [];
    }
  }

  /**
   * Check if IP is rate limited
   * 🔧 STEP 3: DISABLE TO PREVENT 404 ERRORS
   */
  async checkRateLimit(ipAddress: string): Promise<{ allowed: boolean; attemptsRemaining: number; resetTime?: Date }> {
    try {
      // Temporarily disable rate limiting to prevent 404 errors
      console.log('🔧 Rate limiting disabled - would check IP:', ipAddress);
      return { allowed: true, attemptsRemaining: this.MAX_LOGIN_ATTEMPTS };

      /* TODO: Re-enable once login_attempts table is confirmed working
      const { data: attempts, error } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('ip_address', ipAddress)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking rate limit:', error);
        return { allowed: true, attemptsRemaining: this.MAX_LOGIN_ATTEMPTS };
      }

      if (!attempts) {
        return { allowed: true, attemptsRemaining: this.MAX_LOGIN_ATTEMPTS };
      }
      */
    } catch (error) {
      console.error('Error in checkRateLimit:', error);
      return { allowed: true, attemptsRemaining: this.MAX_LOGIN_ATTEMPTS };
    }
  }

  /**
   * Record failed login attempt
   * 🔧 STEP 3: DISABLE TO PREVENT 404 ERRORS
   */
  async recordFailedLogin(ipAddress: string): Promise<void> {
    try {
      // Temporarily disable failed login recording to prevent 404 errors
      console.log('🔧 Failed login recording disabled - would record IP:', ipAddress);
      return;

      /* TODO: Re-enable once login_attempts table is confirmed working
      const { data: existing } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('ip_address', ipAddress)
        .single();

      const now = new Date();
      const attempts = existing ? existing.attempts + 1 : 1;
      const blockedUntil = attempts >= this.MAX_LOGIN_ATTEMPTS
        ? new Date(now.getTime() + this.LOCKOUT_DURATION).toISOString()
        : null;

      const { error } = await supabase
        .from('login_attempts')
        .upsert({
          ip_address: ipAddress,
          attempts,
          last_attempt: now.toISOString(),
          blocked_until: blockedUntil
        });

      if (error) {
        console.error('Error recording failed login:', error);
      }
      */
    } catch (error) {
      console.error('Error in recordFailedLogin:', error);
    }
  }

  /**
   * Reset login attempts for IP
   * 🔧 STEP 3: DISABLE TO PREVENT 404 ERRORS
   */
  async resetLoginAttempts(ipAddress: string): Promise<void> {
    try {
      // Temporarily disable login attempt reset to prevent 404 errors
      console.log('🔧 Login attempt reset disabled - would reset IP:', ipAddress);
      return;

      /* TODO: Re-enable once login_attempts table is confirmed working
      const { error } = await supabase
        .from('login_attempts')
        .delete()
        .eq('ip_address', ipAddress);

      if (error) {
        console.error('Error resetting login attempts:', error);
      }
      */
    } catch (error) {
      console.error('Error in resetLoginAttempts:', error);
    }
  }
}

export const sessionSecurityService = new SessionSecurityService();
