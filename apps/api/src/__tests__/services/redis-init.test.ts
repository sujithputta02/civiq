import { describe, it, expect, vi } from 'vitest';

// Mock ioredis before importing the service
vi.mock('ioredis', () => {
  return {
    Redis: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      set: vi.fn().mockResolvedValue('OK'),
      get: vi.fn().mockResolvedValue(null),
    })),
  };
});

describe('Redis Service Initialization', () => {
  it('should initialize redis with environment URL', async () => {
    // Import the service dynamically to ensure mock is active
    const { default: redis } = await import('../../modules/shared/redis.service.js');
    expect(redis).toBeDefined();
    expect(redis.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(redis.on).toHaveBeenCalledWith('error', expect.any(Function));
  });
});
