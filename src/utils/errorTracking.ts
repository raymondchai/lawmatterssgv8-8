// Error tracking utility for production debugging

interface ErrorLog {
  timestamp: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  url?: string;
  line?: number;
  column?: number;
  userAgent?: string;
  userId?: string;
}

class ErrorTracker {
  private errors: ErrorLog[] = [];
  private readonly maxErrors = 50; // Keep only the last 50 errors
  private readonly isEnabled: boolean;

  constructor() {
    // Only enable error tracking in development or when explicitly enabled
    this.isEnabled = import.meta.env.DEV || import.meta.env.VITE_ERROR_TRACKING === 'true';

    if (this.isEnabled) {
      this.setupErrorHandlers();
    }
  }

  private setupErrorHandlers() {
    // Only capture critical JavaScript errors and unhandled promise rejections
    // Remove console interception to reduce overhead

    // Capture JavaScript errors
    window.addEventListener('error', (event) => {
      // Only log errors that aren't from third-party scripts
      if (event.filename && (event.filename.includes(window.location.origin) || event.filename === '')) {
        this.logError({
          type: 'error',
          message: event.message,
          stack: event.error?.stack,
          url: event.filename,
          line: event.lineno,
          column: event.colno,
        });
      }
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      // Filter out common non-critical rejections
      const reason = String(event.reason);
      if (!reason.includes('AbortError') && !reason.includes('NetworkError')) {
        this.logError({
          type: 'error',
          message: `Unhandled Promise Rejection: ${event.reason}`,
          stack: event.reason?.stack,
        });
      }
    });

    // Don't intercept console methods to reduce performance overhead
    // Applications can use logError() and logWarning() explicitly when needed
  }

  private logError(errorData: Partial<ErrorLog>) {
    if (!this.isEnabled) return;

    const error: ErrorLog = {
      timestamp: new Date().toISOString(),
      type: 'error',
      message: 'Unknown error',
      userAgent: navigator.userAgent,
      ...errorData,
    };

    this.errors.push(error);

    // Keep only the last maxErrors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.group(`🐛 Error Tracked: ${error.type}`);
      console.log('Message:', error.message);
      console.log('Timestamp:', error.timestamp);
      if (error.stack) console.log('Stack:', error.stack);
      if (error.url) console.log('URL:', error.url);
      if (error.line) console.log('Line:', error.line);
      console.groupEnd();
    }
  }

  public getErrors(): ErrorLog[] {
    return [...this.errors];
  }

  public getErrorsByType(type: ErrorLog['type']): ErrorLog[] {
    return this.errors.filter(error => error.type === type);
  }

  public getRecentErrors(minutes: number = 5): ErrorLog[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.errors.filter(error => new Date(error.timestamp) > cutoff);
  }

  public clearErrors(): void {
    this.errors = [];
  }

  public getErrorSummary() {
    const summary = {
      total: this.errors.length,
      errors: this.errors.filter(e => e.type === 'error').length,
      warnings: this.errors.filter(e => e.type === 'warning').length,
      recent: this.getRecentErrors(5).length,
      mostCommon: this.getMostCommonErrors(),
    };

    return summary;
  }

  private getMostCommonErrors() {
    const errorCounts = this.errors.reduce((acc, error) => {
      const key = error.message.substring(0, 100); // First 100 chars
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }));
  }

  public exportErrors(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      errors: this.errors,
      summary: this.getErrorSummary(),
    }, null, 2);
  }
}

// Create global instance
export const errorTracker = new ErrorTracker();

// Make it available globally for debugging
(window as any).__errorTracker = errorTracker;

// Export utility functions
export const logError = (message: string, error?: Error) => {
  errorTracker['logError']({
    type: 'error',
    message,
    stack: error?.stack,
  });
};

export const logWarning = (message: string) => {
  errorTracker['logError']({
    type: 'warning',
    message,
  });
};

export const getErrorSummary = () => errorTracker.getErrorSummary();
export const getRecentErrors = (minutes?: number) => errorTracker.getRecentErrors(minutes);
export const exportErrors = () => errorTracker.exportErrors();
