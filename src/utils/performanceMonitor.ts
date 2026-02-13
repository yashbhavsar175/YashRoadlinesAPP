/**
 * Performance Monitoring Utility
 * 
 * Provides tools for monitoring and profiling app performance,
 * especially for multi-office operations and database queries.
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private completedMetrics: PerformanceMetric[] = [];
  private readonly MAX_STORED_METRICS = 100;

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start tracking a performance metric
   * @param name - Unique identifier for the metric
   * @param metadata - Optional metadata to attach to the metric
   */
  start(name: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata,
    };
    this.metrics.set(name, metric);
    
    if (__DEV__) {
      console.log(`⏱️ Performance: Started tracking "${name}"`);
    }
  }

  /**
   * Stop tracking a performance metric and calculate duration
   * @param name - Identifier of the metric to stop
   * @returns Duration in milliseconds
   */
  end(name: string): number | null {
    const metric = this.metrics.get(name);
    
    if (!metric) {
      console.warn(`⚠️ Performance: No metric found with name "${name}"`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    // Move to completed metrics
    this.completedMetrics.push(metric);
    this.metrics.delete(name);

    // Limit stored metrics
    if (this.completedMetrics.length > this.MAX_STORED_METRICS) {
      this.completedMetrics.shift();
    }

    if (__DEV__) {
      console.log(`✅ Performance: "${name}" completed in ${metric.duration.toFixed(2)}ms`, metric.metadata);
    }

    return metric.duration;
  }

  /**
   * Get statistics for a specific metric type
   * @param namePattern - Pattern to match metric names (supports partial matching)
   * @returns Statistics object with min, max, avg, count
   */
  getStats(namePattern: string): {
    min: number;
    max: number;
    avg: number;
    count: number;
    total: number;
  } | null {
    const matchingMetrics = this.completedMetrics.filter(m => 
      m.name.includes(namePattern) && m.duration !== undefined
    );

    if (matchingMetrics.length === 0) {
      return null;
    }

    const durations = matchingMetrics.map(m => m.duration!);
    const total = durations.reduce((sum, d) => sum + d, 0);

    return {
      min: Math.min(...durations),
      max: Math.max(...durations),
      avg: total / durations.length,
      count: durations.length,
      total,
    };
  }

  /**
   * Get all completed metrics
   * @returns Array of completed metrics
   */
  getAllMetrics(): PerformanceMetric[] {
    return [...this.completedMetrics];
  }

  /**
   * Get metrics matching a pattern
   * @param namePattern - Pattern to match metric names
   * @returns Array of matching metrics
   */
  getMetricsByPattern(namePattern: string): PerformanceMetric[] {
    return this.completedMetrics.filter(m => m.name.includes(namePattern));
  }

  /**
   * Clear all stored metrics
   */
  clear(): void {
    this.metrics.clear();
    this.completedMetrics = [];
    
    if (__DEV__) {
      console.log('🧹 Performance: All metrics cleared');
    }
  }

  /**
   * Generate a performance report
   * @returns Formatted performance report string
   */
  generateReport(): string {
    const report: string[] = ['📊 Performance Report', '='.repeat(50)];

    // Group metrics by category (first part of name before ':')
    const categories = new Map<string, PerformanceMetric[]>();
    
    this.completedMetrics.forEach(metric => {
      const category = metric.name.split(':')[0];
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(metric);
    });

    // Generate stats for each category
    categories.forEach((metrics, category) => {
      const durations = metrics.map(m => m.duration!).filter(d => d !== undefined);
      
      if (durations.length > 0) {
        const total = durations.reduce((sum, d) => sum + d, 0);
        const avg = total / durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);

        report.push('');
        report.push(`Category: ${category}`);
        report.push(`  Count: ${durations.length}`);
        report.push(`  Avg: ${avg.toFixed(2)}ms`);
        report.push(`  Min: ${min.toFixed(2)}ms`);
        report.push(`  Max: ${max.toFixed(2)}ms`);
        report.push(`  Total: ${total.toFixed(2)}ms`);
      }
    });

    report.push('');
    report.push('='.repeat(50));

    return report.join('\n');
  }

  /**
   * Log the performance report to console
   */
  logReport(): void {
    console.log(this.generateReport());
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * Decorator function to measure performance of async functions
 * @param metricName - Name for the performance metric
 */
export function measurePerformance(metricName: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const monitor = PerformanceMonitor.getInstance();
      const uniqueName = `${metricName}:${Date.now()}`;
      
      monitor.start(uniqueName, { method: propertyKey, args: args.length });
      
      try {
        const result = await originalMethod.apply(this, args);
        monitor.end(uniqueName);
        return result;
      } catch (error) {
        monitor.end(uniqueName);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Utility function to measure a code block's performance
 * @param name - Name for the metric
 * @param fn - Function to measure
 * @returns Result of the function
 */
export async function measure<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const monitor = PerformanceMonitor.getInstance();
  monitor.start(name);
  
  try {
    const result = await fn();
    monitor.end(name);
    return result;
  } catch (error) {
    monitor.end(name);
    throw error;
  }
}

/**
 * Query performance analyzer for database operations
 */
export class QueryPerformanceAnalyzer {
  private queryTimes: Map<string, number[]> = new Map();

  /**
   * Record a query execution time
   * @param queryName - Name/identifier of the query
   * @param duration - Duration in milliseconds
   * @param officeId - Optional office ID for filtering analysis
   */
  recordQuery(queryName: string, duration: number, officeId?: string): void {
    const key = officeId ? `${queryName}:${officeId}` : queryName;
    
    if (!this.queryTimes.has(key)) {
      this.queryTimes.set(key, []);
    }
    
    this.queryTimes.get(key)!.push(duration);

    // Log slow queries (> 1000ms)
    if (duration > 1000 && __DEV__) {
      console.warn(`🐌 Slow Query Detected: "${queryName}" took ${duration.toFixed(2)}ms`, { officeId });
    }
  }

  /**
   * Get statistics for a specific query
   * @param queryName - Name of the query
   * @returns Query statistics
   */
  getQueryStats(queryName: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
  } | null {
    const times = this.queryTimes.get(queryName);
    
    if (!times || times.length === 0) {
      return null;
    }

    const sorted = [...times].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const p95Index = Math.floor(sorted.length * 0.95);

    return {
      count: sorted.length,
      avg: sum / sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[p95Index],
    };
  }

  /**
   * Get all query statistics
   * @returns Map of query names to statistics
   */
  getAllStats(): Map<string, ReturnType<QueryPerformanceAnalyzer['getQueryStats']>> {
    const stats = new Map();
    
    this.queryTimes.forEach((_, queryName) => {
      stats.set(queryName, this.getQueryStats(queryName));
    });

    return stats;
  }

  /**
   * Generate a report of query performance
   * @returns Formatted report string
   */
  generateReport(): string {
    const report: string[] = ['📊 Query Performance Report', '='.repeat(60)];

    const allStats = this.getAllStats();
    
    // Sort by average time (slowest first)
    const sortedStats = Array.from(allStats.entries())
      .filter(([_, stats]) => stats !== null)
      .sort((a, b) => b[1]!.avg - a[1]!.avg);

    sortedStats.forEach(([queryName, stats]) => {
      if (stats) {
        report.push('');
        report.push(`Query: ${queryName}`);
        report.push(`  Executions: ${stats.count}`);
        report.push(`  Average: ${stats.avg.toFixed(2)}ms`);
        report.push(`  Min: ${stats.min.toFixed(2)}ms`);
        report.push(`  Max: ${stats.max.toFixed(2)}ms`);
        report.push(`  P95: ${stats.p95.toFixed(2)}ms`);
      }
    });

    report.push('');
    report.push('='.repeat(60));

    return report.join('\n');
  }

  /**
   * Log the query performance report
   */
  logReport(): void {
    console.log(this.generateReport());
  }

  /**
   * Clear all recorded query times
   */
  clear(): void {
    this.queryTimes.clear();
    
    if (__DEV__) {
      console.log('🧹 Query Performance: All data cleared');
    }
  }
}

// Export singleton instance
export const queryPerformanceAnalyzer = new QueryPerformanceAnalyzer();
