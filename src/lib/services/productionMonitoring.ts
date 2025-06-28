/**
 * Production Monitoring Service
 * Handles error tracking, performance monitoring, and user analytics
 */

interface ErrorReport {
  timestamp: string;
  error: string;
  context: string;
  userId?: string;
  userAgent: string;
  url: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface PerformanceMetric {
  timestamp: string;
  metric: string;
  value: number;
  context: string;
}

interface UserAction {
  timestamp: string;
  action: string;
  context: string;
  userId?: string;
  success: boolean;
  duration?: number;
}

class ProductionMonitoringService {
  private isProduction = import.meta.env.PROD;
  private errorQueue: ErrorReport[] = [];
  private performanceQueue: PerformanceMetric[] = [];
  private actionQueue: UserAction[] = [];
  private flushInterval: number | null = null;

  constructor() {
    if (this.isProduction) {
      this.startPeriodicFlush();
    }
  }

  /**
   * Log an error for monitoring
   */
  logError(error: Error | string, context: string, severity: ErrorReport['severity'] = 'medium', userId?: string) {
    const errorReport: ErrorReport = {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : error,
      context,
      userId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      severity
    };

    this.errorQueue.push(errorReport);

    // Log to console in development
    if (!this.isProduction) {
      console.error(`[${severity.toUpperCase()}] ${context}:`, error);
    }

    // Immediate flush for critical errors
    if (severity === 'critical') {
      this.flushErrors();
    }
  }

  /**
   * Log a performance metric
   */
  logPerformance(metric: string, value: number, context: string) {
    const performanceMetric: PerformanceMetric = {
      timestamp: new Date().toISOString(),
      metric,
      value,
      context
    };

    this.performanceQueue.push(performanceMetric);

    if (!this.isProduction) {
      console.log(`[PERF] ${metric}: ${value}ms in ${context}`);
    }
  }

  /**
   * Log a user action
   */
  logUserAction(action: string, context: string, success: boolean, duration?: number, userId?: string) {
    const userAction: UserAction = {
      timestamp: new Date().toISOString(),
      action,
      context,
      userId,
      success,
      duration
    };

    this.actionQueue.push(userAction);

    if (!this.isProduction) {
      console.log(`[ACTION] ${action} in ${context}: ${success ? 'SUCCESS' : 'FAILED'}${duration ? ` (${duration}ms)` : ''}`);
    }
  }

  /**
   * Start periodic flushing of queued data
   */
  private startPeriodicFlush() {
    this.flushInterval = window.setInterval(() => {
      this.flushAll();
    }, 30000); // Flush every 30 seconds
  }

  /**
   * Flush all queued data
   */
  private async flushAll() {
    await Promise.all([
      this.flushErrors(),
      this.flushPerformance(),
      this.flushUserActions()
    ]);
  }

  /**
   * Flush error reports
   */
  private async flushErrors() {
    if (this.errorQueue.length === 0) return;

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    try {
      // In production, you would send to your monitoring service
      // For now, we'll use console.warn to avoid spamming
      if (this.isProduction) {
        console.warn('Production errors detected:', errors.length);
        // Example: await fetch('/api/monitoring/errors', { method: 'POST', body: JSON.stringify(errors) });
      }
    } catch (error) {
      // Re-queue errors if flush fails
      this.errorQueue.unshift(...errors);
      console.error('Failed to flush errors:', error);
    }
  }

  /**
   * Flush performance metrics
   */
  private async flushPerformance() {
    if (this.performanceQueue.length === 0) return;

    const metrics = [...this.performanceQueue];
    this.performanceQueue = [];

    try {
      if (this.isProduction) {
        // Example: await fetch('/api/monitoring/performance', { method: 'POST', body: JSON.stringify(metrics) });
      }
    } catch (error) {
      this.performanceQueue.unshift(...metrics);
      console.error('Failed to flush performance metrics:', error);
    }
  }

  /**
   * Flush user actions
   */
  private async flushUserActions() {
    if (this.actionQueue.length === 0) return;

    const actions = [...this.actionQueue];
    this.actionQueue = [];

    try {
      if (this.isProduction) {
        // Example: await fetch('/api/monitoring/actions', { method: 'POST', body: JSON.stringify(actions) });
      }
    } catch (error) {
      this.actionQueue.unshift(...actions);
      console.error('Failed to flush user actions:', error);
    }
  }

  /**
   * Cleanup when service is destroyed
   */
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Final flush
    this.flushAll();
  }
}

// Create singleton instance
export const productionMonitoring = new ProductionMonitoringService();

// Convenience functions
export const logError = (error: Error | string, context: string, severity?: ErrorReport['severity'], userId?: string) => {
  productionMonitoring.logError(error, context, severity, userId);
};

export const logPerformance = (metric: string, value: number, context: string) => {
  productionMonitoring.logPerformance(metric, value, context);
};

export const logUserAction = (action: string, context: string, success: boolean, duration?: number, userId?: string) => {
  productionMonitoring.logUserAction(action, context, success, duration, userId);
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    productionMonitoring.destroy();
  });
}
