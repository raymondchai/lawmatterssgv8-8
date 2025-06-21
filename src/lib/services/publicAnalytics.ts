import { supabase } from '@/lib/supabase';

export interface AnalyticsEvent {
  event_type: string;
  event_data: Record<string, any>;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  page_url?: string;
  referrer?: string;
  timestamp?: string;
}

export interface ConversionFunnelData {
  step: string;
  count: number;
  conversion_rate?: number;
}

export interface UsageMetrics {
  total_sessions: number;
  total_analyses: number;
  unique_visitors: number;
  conversion_rate: number;
  avg_session_duration: number;
  popular_document_types: Array<{ type: string; count: number }>;
  peak_hours: Array<{ hour: number; count: number }>;
  bounce_rate: number;
}

class PublicAnalyticsService {
  private sessionId: string | null = null;
  private sessionStartTime: number = Date.now();

  /**
   * Initialize analytics session
   */
  async initializeSession(): Promise<string> {
    if (this.sessionId) {
      return this.sessionId;
    }

    this.sessionId = crypto.randomUUID();
    this.sessionStartTime = Date.now();

    // Track session start
    await this.trackEvent('session_start', {
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language
    });

    return this.sessionId;
  }

  /**
   * Track an analytics event
   */
  async trackEvent(eventType: string, eventData: Record<string, any> = {}): Promise<void> {
    try {
      if (!this.sessionId) {
        await this.initializeSession();
      }

      const event: AnalyticsEvent = {
        event_type: eventType,
        event_data: {
          ...eventData,
          session_duration: Date.now() - this.sessionStartTime
        },
        session_id: this.sessionId,
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent,
        page_url: window.location.href,
        referrer: document.referrer || null,
        timestamp: new Date().toISOString()
      };

      // Store in database
      const { error } = await supabase
        .from('public_analytics_events')
        .insert(event);

      if (error) {
        console.error('Analytics tracking error:', error);
      }

      // Also send to external analytics if configured
      await this.sendToExternalAnalytics(event);

    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  /**
   * Track page view
   */
  async trackPageView(pageName: string, additionalData: Record<string, any> = {}): Promise<void> {
    await this.trackEvent('page_view', {
      page_name: pageName,
      ...additionalData
    });
  }

  /**
   * Track document upload
   */
  async trackDocumentUpload(fileSize: number, fileType: string, fileName: string): Promise<void> {
    await this.trackEvent('document_upload', {
      file_size: fileSize,
      file_type: fileType,
      file_name_length: fileName.length,
      file_extension: fileName.split('.').pop()?.toLowerCase()
    });
  }

  /**
   * Track analysis completion
   */
  async trackAnalysisComplete(
    analysisId: string,
    processingTime: number,
    documentType: string,
    textLength: number
  ): Promise<void> {
    await this.trackEvent('analysis_complete', {
      analysis_id: analysisId,
      processing_time: processingTime,
      document_type: documentType,
      text_length: textLength
    });
  }

  /**
   * Track conversion events
   */
  async trackConversion(conversionType: 'registration' | 'subscription' | 'upgrade', additionalData: Record<string, any> = {}): Promise<void> {
    await this.trackEvent('conversion', {
      conversion_type: conversionType,
      ...additionalData
    });
  }

  /**
   * Track user interactions
   */
  async trackInteraction(interactionType: string, element: string, additionalData: Record<string, any> = {}): Promise<void> {
    await this.trackEvent('user_interaction', {
      interaction_type: interactionType,
      element,
      ...additionalData
    });
  }

  /**
   * Track errors
   */
  async trackError(errorType: string, errorMessage: string, additionalData: Record<string, any> = {}): Promise<void> {
    await this.trackEvent('error', {
      error_type: errorType,
      error_message: errorMessage,
      ...additionalData
    });
  }

  /**
   * Track rate limit hits
   */
  async trackRateLimit(limitType: 'hourly' | 'daily', remaining: number): Promise<void> {
    await this.trackEvent('rate_limit_hit', {
      limit_type: limitType,
      remaining_quota: remaining
    });
  }

  /**
   * Get conversion funnel data
   */
  async getConversionFunnel(dateRange: { start: string; end: string }): Promise<ConversionFunnelData[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_conversion_funnel', {
          start_date: dateRange.start,
          end_date: dateRange.end
        });

      if (error) {
        console.error('Error getting conversion funnel:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get conversion funnel:', error);
      return [];
    }
  }

  /**
   * Get usage metrics
   */
  async getUsageMetrics(dateRange: { start: string; end: string }): Promise<UsageMetrics | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_usage_metrics', {
          start_date: dateRange.start,
          end_date: dateRange.end
        });

      if (error) {
        console.error('Error getting usage metrics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get usage metrics:', error);
      return null;
    }
  }

  /**
   * Get client IP address
   */
  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return '127.0.0.1';
    }
  }

  /**
   * Send events to external analytics services
   */
  private async sendToExternalAnalytics(event: AnalyticsEvent): Promise<void> {
    try {
      // Google Analytics 4 (if configured)
      if (typeof gtag !== 'undefined') {
        gtag('event', event.event_type, {
          custom_parameter_1: JSON.stringify(event.event_data),
          session_id: event.session_id
        });
      }

      // PostHog (if configured)
      if (typeof posthog !== 'undefined') {
        posthog.capture(event.event_type, {
          ...event.event_data,
          session_id: event.session_id,
          ip_address: event.ip_address
        });
      }

      // Mixpanel (if configured)
      if (typeof mixpanel !== 'undefined') {
        mixpanel.track(event.event_type, {
          ...event.event_data,
          session_id: event.session_id
        });
      }

    } catch (error) {
      console.error('Failed to send to external analytics:', error);
    }
  }

  /**
   * Track session end
   */
  async trackSessionEnd(): Promise<void> {
    if (this.sessionId) {
      await this.trackEvent('session_end', {
        session_duration: Date.now() - this.sessionStartTime
      });
    }
  }

  /**
   * Get session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Reset session (for testing or manual reset)
   */
  resetSession(): void {
    this.sessionId = null;
    this.sessionStartTime = Date.now();
  }
}

// Create singleton instance
export const publicAnalyticsService = new PublicAnalyticsService();

// Auto-track session end on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    publicAnalyticsService.trackSessionEnd();
  });

  // Track page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      publicAnalyticsService.trackEvent('page_hidden');
    } else {
      publicAnalyticsService.trackEvent('page_visible');
    }
  });
}
