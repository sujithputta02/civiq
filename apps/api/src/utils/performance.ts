/**
 * Performance monitoring utilities for tracking API efficiency
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  tags?: Record<string, string>;
}

const metrics: PerformanceMetric[] = [];
const MAX_METRICS = 1000;

/**
 * Record a performance metric
 */
export function recordMetric(
  name: string,
  duration: number,
  tags?: Record<string, string>
): void {
  metrics.push({
    name,
    duration,
    timestamp: Date.now(),
    tags,
  });

  // Keep metrics array bounded
  if (metrics.length > MAX_METRICS) {
    metrics.shift();
  }

  // Log slow operations
  if (duration > 1000) {
    console.warn(`Slow operation: ${name} took ${duration}ms`, tags);
  }
}

/**
 * Measure function execution time
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    recordMetric(name, duration, tags);
  }
}

/**
 * Measure synchronous function execution time
 */
export function measureSync<T>(
  name: string,
  fn: () => T,
  tags?: Record<string, string>
): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    recordMetric(name, duration, tags);
  }
}

/**
 * Get performance statistics
 */
export function getStats(name?: string): {
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  p99Duration: number;
} {
  const filtered = name
    ? metrics.filter((m) => m.name === name)
    : metrics;

  if (filtered.length === 0) {
    return {
      count: 0,
      avgDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      p95Duration: 0,
      p99Duration: 0,
    };
  }

  const durations = filtered.map((m) => m.duration).sort((a, b) => a - b);
  const sum = durations.reduce((a, b) => a + b, 0);

  return {
    count: durations.length,
    avgDuration: sum / durations.length,
    minDuration: durations[0],
    maxDuration: durations[durations.length - 1],
    p95Duration: durations[Math.floor(durations.length * 0.95)],
    p99Duration: durations[Math.floor(durations.length * 0.99)],
  };
}

/**
 * Clear metrics
 */
export function clearMetrics(): void {
  metrics.length = 0;
}
