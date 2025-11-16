/**
 * Performance monitoring and metrics collection system
 */

import { logger } from './logger.js';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  timestamp: number;
  tags?: Record<string, string>;
}

export interface TimerResult {
  duration: number;
  success: boolean;
  error?: Error;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private activeTimers: Map<string, number> = new Map();
  private aggregatedStats: Map<string, {
    count: number;
    total: number;
    min: number;
    max: number;
    avg: number;
    successCount: number;
    failureCount: number;
  }> = new Map();

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start a timer
   */
  startTimer(name: string): void {
    this.activeTimers.set(name, Date.now());
  }

  /**
   * End a timer and record metric
   */
  endTimer(name: string, success: boolean = true, error?: Error): TimerResult {
    const startTime = this.activeTimers.get(name);

    if (!startTime) {
      logger.warn('Timer not found', { name });
      return { duration: 0, success: false };
    }

    const duration = Date.now() - startTime;
    this.activeTimers.delete(name);

    // Record metric
    this.recordMetric({
      name,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      tags: {
        success: success.toString(),
        hasError: (!!error).toString()
      }
    });

    // Update aggregated stats
    this.updateAggregatedStats(name, duration, success);

    return { duration, success, error };
  }

  /**
   * Time an async function
   */
  async timeAsync<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = Date.now();
    let success = true;
    let error: Error | undefined;

    try {
      const result = await fn();
      return result;
    } catch (err) {
      success = false;
      error = err as Error;
      throw err;
    } finally {
      const duration = Date.now() - startTime;

      this.recordMetric({
        name,
        value: duration,
        unit: 'ms',
        timestamp: Date.now(),
        tags: {
          ...tags,
          success: success.toString(),
          hasError: (!!error).toString()
        }
      });

      this.updateAggregatedStats(name, duration, success);

      logger.debug('Performance metric recorded', {
        name,
        duration,
        success,
        tags
      });
    }
  }

  /**
   * Time a synchronous function
   */
  timeSync<T>(
    name: string,
    fn: () => T,
    tags?: Record<string, string>
  ): T {
    const startTime = Date.now();
    let success = true;
    let error: Error | undefined;

    try {
      const result = fn();
      return result;
    } catch (err) {
      success = false;
      error = err as Error;
      throw err;
    } finally {
      const duration = Date.now() - startTime;

      this.recordMetric({
        name,
        value: duration,
        unit: 'ms',
        timestamp: Date.now(),
        tags: {
          ...tags,
          success: success.toString(),
          hasError: (!!error).toString()
        }
      });

      this.updateAggregatedStats(name, duration, success);
    }
  }

  /**
   * Record a custom metric
   */
  recordMetric(metric: PerformanceMetric): void {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }

    this.metrics.get(metric.name)!.push(metric);

    // Keep only last 1000 metrics per name
    const metrics = this.metrics.get(metric.name)!;
    if (metrics.length > 1000) {
      metrics.shift();
    }
  }

  /**
   * Update aggregated statistics
   */
  private updateAggregatedStats(name: string, value: number, success: boolean): void {
    if (!this.aggregatedStats.has(name)) {
      this.aggregatedStats.set(name, {
        count: 0,
        total: 0,
        min: Infinity,
        max: -Infinity,
        avg: 0,
        successCount: 0,
        failureCount: 0
      });
    }

    const stats = this.aggregatedStats.get(name)!;
    stats.count++;
    stats.total += value;
    stats.min = Math.min(stats.min, value);
    stats.max = Math.max(stats.max, value);
    stats.avg = stats.total / stats.count;

    if (success) {
      stats.successCount++;
    } else {
      stats.failureCount++;
    }
  }

  /**
   * Get metrics for a specific name
   */
  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.get(name) || [];
  }

  /**
   * Get aggregated stats
   */
  getStats(name: string): {
    count: number;
    total: number;
    min: number;
    max: number;
    avg: number;
    successCount: number;
    failureCount: number;
    successRate: number;
  } | undefined {
    const stats = this.aggregatedStats.get(name);

    if (!stats) {
      return undefined;
    }

    return {
      ...stats,
      successRate: stats.count > 0
        ? (stats.successCount / stats.count) * 100
        : 0
    };
  }

  /**
   * Get all stats
   */
  getAllStats(): Record<string, ReturnType<PerformanceMonitor['getStats']>> {
    const result: Record<string, any> = {};

    for (const name of this.aggregatedStats.keys()) {
      result[name] = this.getStats(name);
    }

    return result;
  }

  /**
   * Get metrics summary
   */
  getSummary(): {
    totalMetrics: number;
    metricNames: string[];
    overallSuccessRate: number;
    totalExecutionTime: number;
  } {
    let totalMetrics = 0;
    let totalSuccess = 0;
    let totalFailure = 0;
    let totalTime = 0;

    for (const stats of this.aggregatedStats.values()) {
      totalMetrics += stats.count;
      totalSuccess += stats.successCount;
      totalFailure += stats.failureCount;
      totalTime += stats.total;
    }

    return {
      totalMetrics,
      metricNames: Array.from(this.aggregatedStats.keys()),
      overallSuccessRate: totalMetrics > 0
        ? (totalSuccess / totalMetrics) * 100
        : 0,
      totalExecutionTime: totalTime
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.aggregatedStats.clear();
    this.activeTimers.clear();
    logger.info('Performance metrics cleared');
  }

  /**
   * Clear metrics for a specific name
   */
  clearMetrics(name: string): void {
    this.metrics.delete(name);
    this.aggregatedStats.delete(name);
  }

  /**
   * Get slow operations (above threshold)
   */
  getSlowOperations(thresholdMs: number = 1000): {
    name: string;
    duration: number;
    timestamp: number;
    tags?: Record<string, string>;
  }[] {
    const slowOps: any[] = [];

    for (const [name, metrics] of this.metrics.entries()) {
      for (const metric of metrics) {
        if (metric.value > thresholdMs) {
          slowOps.push({
            name,
            duration: metric.value,
            timestamp: metric.timestamp,
            tags: metric.tags
          });
        }
      }
    }

    return slowOps.sort((a, b) => b.duration - a.duration);
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      summary: this.getSummary(),
      stats: this.getAllStats(),
      slowOperations: this.getSlowOperations()
    }, null, 2);
  }

  /**
   * Log performance summary
   */
  logSummary(): void {
    const summary = this.getSummary();
    const stats = this.getAllStats();

    logger.info('Performance Summary', {
      totalMetrics: summary.totalMetrics,
      metricCount: summary.metricNames.length,
      successRate: `${summary.overallSuccessRate.toFixed(2)}%`,
      totalTime: `${(summary.totalExecutionTime / 1000).toFixed(2)}s`
    });

    for (const [name, stat] of Object.entries(stats)) {
      if (stat) {
        logger.info(`  ${name}`, {
          count: stat.count,
          avg: `${stat.avg.toFixed(2)}ms`,
          min: `${stat.min.toFixed(2)}ms`,
          max: `${stat.max.toFixed(2)}ms`,
          successRate: `${stat.successRate.toFixed(2)}%`
        });
      }
    }
  }
}

/**
 * Performance decorator for async methods
 */
export function measurePerformance(metricName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.timeAsync(
        name,
        () => originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}

/**
 * Performance decorator for sync methods
 */
export function measurePerformanceSync(metricName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      return performanceMonitor.timeSync(
        name,
        () => originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();
