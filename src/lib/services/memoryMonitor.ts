// Memory monitoring service to prevent memory issues
export interface MemoryStats {
  usedJSHeapSize: number; // bytes
  totalJSHeapSize: number; // bytes
  jsHeapSizeLimit: number; // bytes
  usedMB: number;
  totalMB: number;
  limitMB: number;
  usagePercentage: number;
}

export interface MemoryThresholds {
  warning: number; // percentage
  critical: number; // percentage
  emergency: number; // percentage
}

class MemoryMonitorService {
  private thresholds: MemoryThresholds = {
    warning: 70,   // 70% memory usage
    critical: 85,  // 85% memory usage
    emergency: 95  // 95% memory usage
  };

  private listeners: Array<(stats: MemoryStats) => void> = [];
  private warningListeners: Array<(stats: MemoryStats) => void> = [];
  private criticalListeners: Array<(stats: MemoryStats) => void> = [];
  private emergencyListeners: Array<(stats: MemoryStats) => void> = [];

  private monitoringInterval: number | null = null;
  private lastStats: MemoryStats | null = null;

  constructor() {
    this.startMonitoring();
  }

  getMemoryStats(): MemoryStats | null {
    if (!this.isMemoryAPIAvailable()) {
      return null;
    }

    const memory = performance.memory!;
    const usedMB = memory.usedJSHeapSize / 1024 / 1024;
    const totalMB = memory.totalJSHeapSize / 1024 / 1024;
    const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
    const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedMB,
      totalMB,
      limitMB,
      usagePercentage
    };
  }

  isMemoryAPIAvailable(): boolean {
    return typeof performance !== 'undefined' && 
           performance.memory !== undefined;
  }

  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    if (!this.isMemoryAPIAvailable()) {
      console.warn('Memory API not available, monitoring disabled');
      return;
    }

    this.monitoringInterval = window.setInterval(() => {
      const stats = this.getMemoryStats();
      if (stats) {
        this.lastStats = stats;
        this.checkThresholds(stats);
        this.notifyListeners(stats);
      }
    }, intervalMs);

    console.log('Memory monitoring started');
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Memory monitoring stopped');
    }
  }

  private checkThresholds(stats: MemoryStats): void {
    const { usagePercentage } = stats;

    if (usagePercentage >= this.thresholds.emergency) {
      this.notifyEmergencyListeners(stats);
      console.error(`EMERGENCY: Memory usage at ${usagePercentage.toFixed(1)}%`);
    } else if (usagePercentage >= this.thresholds.critical) {
      this.notifyCriticalListeners(stats);
      console.warn(`CRITICAL: Memory usage at ${usagePercentage.toFixed(1)}%`);
    } else if (usagePercentage >= this.thresholds.warning) {
      this.notifyWarningListeners(stats);
      console.warn(`WARNING: Memory usage at ${usagePercentage.toFixed(1)}%`);
    }
  }

  private notifyListeners(stats: MemoryStats): void {
    this.listeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        console.error('Error in memory stats listener:', error);
      }
    });
  }

  private notifyWarningListeners(stats: MemoryStats): void {
    this.warningListeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        console.error('Error in memory warning listener:', error);
      }
    });
  }

  private notifyCriticalListeners(stats: MemoryStats): void {
    this.criticalListeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        console.error('Error in memory critical listener:', error);
      }
    });
  }

  private notifyEmergencyListeners(stats: MemoryStats): void {
    this.emergencyListeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        console.error('Error in memory emergency listener:', error);
      }
    });
  }

  // Event listeners
  onMemoryStats(listener: (stats: MemoryStats) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  onMemoryWarning(listener: (stats: MemoryStats) => void): () => void {
    this.warningListeners.push(listener);
    return () => {
      const index = this.warningListeners.indexOf(listener);
      if (index > -1) {
        this.warningListeners.splice(index, 1);
      }
    };
  }

  onMemoryCritical(listener: (stats: MemoryStats) => void): () => void {
    this.criticalListeners.push(listener);
    return () => {
      const index = this.criticalListeners.indexOf(listener);
      if (index > -1) {
        this.criticalListeners.splice(index, 1);
      }
    };
  }

  onMemoryEmergency(listener: (stats: MemoryStats) => void): () => void {
    this.emergencyListeners.push(listener);
    return () => {
      const index = this.emergencyListeners.indexOf(listener);
      if (index > -1) {
        this.emergencyListeners.splice(index, 1);
      }
    };
  }

  // Utility methods
  getLastStats(): MemoryStats | null {
    return this.lastStats;
  }

  setThresholds(thresholds: Partial<MemoryThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  getThresholds(): MemoryThresholds {
    return { ...this.thresholds };
  }

  // Force garbage collection if available (Chrome DevTools)
  forceGarbageCollection(): void {
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
      console.log('Forced garbage collection');
    } else {
      console.warn('Garbage collection not available');
    }
  }
}

// Export singleton instance
export const memoryMonitor = new MemoryMonitorService();
