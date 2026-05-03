import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  recordMetric,
  measureAsync,
  measureSync,
  getStats,
  clearMetrics,
} from '../../utils/performance.js';

describe('Performance Utils', () => {
  beforeEach(() => {
    clearMetrics();
  });

  it('should record and aggregate metrics', () => {
    recordMetric('test', 100);
    recordMetric('test', 200);
    const stats = getStats('test');
    expect(stats.count).toBe(2);
    expect(stats.avgDuration).toBe(150);

    // Global stats (line 78)
    const globalStats = getStats();
    expect(globalStats.count).toBe(2);
  });

  it('should handle zero metrics safely', () => {
    const stats = getStats('non-existent');
    expect(stats.count).toBe(0);
    expect(stats.avgDuration).toBe(0);
  });

  it('should bound metrics to MAX_METRICS', () => {
    for (let i = 0; i < 1100; i++) {
      recordMetric('flood', i);
    }
    const stats = getStats('flood');
    expect(stats.count).toBe(1000);
  });

  it('should warn for slow operations', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    recordMetric('slow', 1500);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should measure async execution', async () => {
    const result = await measureAsync('async-test', async () => {
      return 'done';
    });
    expect(result).toBe('done');
    expect(getStats('async-test').count).toBe(1);
  });

  it('should measure sync execution', () => {
    const result = measureSync('sync-test', () => 'done');
    expect(result).toBe('done');
    expect(getStats('sync-test').count).toBe(1);
  });

  it('should calculate percentiles', () => {
    for (let i = 1; i <= 100; i++) {
      recordMetric('percentile', i);
    }
    const stats = getStats('percentile');
    // durations[95] for [1..100] is 96
    expect(stats.p95Duration).toBe(96);
    // durations[99] for [1..100] is 100
    expect(stats.p99Duration).toBe(100);
  });
});
