/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  generateDeviceFingerprint,
  validateSessionFingerprint,
  validateSessionSecurity,
  detectSuspiciousActivity,
  detectSuspiciousActivityMiddleware,
  generateSecureSessionToken,
  validateSessionTokenExpiration,
  generateCsrfToken,
  validateCsrfToken,
  logActivity,
  clearSession,
  clearActivityLogs,
} from '../../middleware/security.js';

// Mock Redis service
vi.mock('../../modules/shared/redis.service.js', () => {
  const store = new Map<string, any>();
  return {
    default: {
      get: vi.fn(async (key) => store.get(key)),
      set: vi.fn(async (key, value) => {
        store.set(key, value);
        return 'OK';
      }),
      del: vi.fn(async (key) => {
        store.delete(key);
        return 1;
      }),
      lpush: vi.fn(async (key, value) => {
        const list = store.get(key) || [];
        list.unshift(value);
        store.set(key, list);
        return list.length;
      }),
      lrange: vi.fn(async (key, start, stop) => {
        const list = store.get(key) || [];
        return list.slice(start, stop === -1 ? undefined : stop + 1);
      }),
      ltrim: vi.fn(async (key, start, stop) => {
        const list = store.get(key) || [];
        store.set(key, list.slice(start, stop === -1 ? undefined : stop + 1));
        return 'OK';
      }),
      expire: vi.fn(async () => 1),
    },
  };
});

describe('Security Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(async () => {
    req = {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'accept-language': 'en-US,en;q=0.9',
        'accept-encoding': 'gzip, deflate, br',
      },
      ip: '192.168.1.1',
      method: 'POST',
      path: '/api/v1/verify',
      body: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn() as unknown as NextFunction;
    await clearSession('user123');
    await clearActivityLogs('user123');
  });

  describe('generateDeviceFingerprint', () => {
    it('should generate a consistent fingerprint', () => {
      const fp1 = generateDeviceFingerprint(req as Request);
      const fp2 = generateDeviceFingerprint(req as Request);
      expect(fp1).toBe(fp2);
      expect(fp1.length).toBe(64); // SHA-256 hex length
    });

    it('should change fingerprint if User-Agent changes', () => {
      const fp1 = generateDeviceFingerprint(req as Request);
      req.headers!['user-agent'] = 'Different Browser';
      const fp2 = generateDeviceFingerprint(req as Request);
      expect(fp1).not.toBe(fp2);
    });
  });

  describe('validateSessionFingerprint', () => {
    it('should allow first-time fingerprint storage', async () => {
      const fp = generateDeviceFingerprint(req as Request);
      const result = await validateSessionFingerprint(req as Request, 'user123', fp);
      expect(result).toBe(true);
    });

    it('should allow matching fingerprint', async () => {
      const fp = generateDeviceFingerprint(req as Request);
      await validateSessionFingerprint(req as Request, 'user123', fp);
      const result = await validateSessionFingerprint(req as Request, 'user123', fp);
      expect(result).toBe(true);
    });

    it('should reject different fingerprint (hijacking)', async () => {
      const fp1 = generateDeviceFingerprint(req as Request);
      await validateSessionFingerprint(req as Request, 'user123', fp1);

      req.headers!['user-agent'] = 'Attacker Browser';
      const fp2 = generateDeviceFingerprint(req as Request);
      const result = await validateSessionFingerprint(req as Request, 'user123', fp2);
      expect(result).toBe(false);
    });
  });

  describe('validateSessionSecurity Middleware', () => {
    it('should call next for valid session', async () => {
      (req as any).user = { uid: 'user123' };
      await validateSessionSecurity(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 for hijacking attempt', async () => {
      (req as any).user = { uid: 'user123' };
      const fp1 = generateDeviceFingerprint(req as Request);
      await validateSessionFingerprint(req as Request, 'user123', fp1);

      req.headers!['user-agent'] = 'Attacker Browser';
      await validateSessionSecurity(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Suspicious Activity Detection', () => {
    it('should not detect activity with few logs', async () => {
      await logActivity('user123', 'TEST', '192.168.1.1');
      const detected = await detectSuspiciousActivity('user123');
      expect(detected).toBe(false);
    });

    it('should detect suspicious activity (burst of requests from multiple IPs)', async () => {
      await logActivity('user123', 'A1', '1.1.1.1');
      await logActivity('user123', 'A2', '1.1.1.2');
      await logActivity('user123', 'A3', '1.1.1.3');
      await logActivity('user123', 'A4', '1.1.1.4');
      await logActivity('user123', 'A5', '1.1.1.5');
      const detected = await detectSuspiciousActivity('user123');
      expect(detected).toBe(true);
    });
  });

  describe('detectSuspiciousActivityMiddleware', () => {
    it('should block after detecting burst', async () => {
      (req as any).user = { uid: 'user123' };
      for (let i = 0; i < 6; i++) {
        await logActivity('user123', `A${i}`, `1.1.1.${i}`);
      }

      await detectSuspiciousActivityMiddleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Token & CSRF', () => {
    it('should generate and validate session tokens', () => {
      const token = generateSecureSessionToken('user123');
      expect(validateSessionTokenExpiration(token)).toBe(true);
    });

    it('should generate and validate CSRF tokens', () => {
      const token = generateCsrfToken();
      expect(validateCsrfToken(token, token)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent fingerprint validations', async () => {
      const fp = generateDeviceFingerprint(req as Request);
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(validateSessionFingerprint(req as Request, 'user123', fp));
      }
      const outcomes = await Promise.all(results);
      expect(outcomes.every((r) => r === true)).toBe(true);
    });

    it('should handle very long user IDs', async () => {
      const longUserId = 'a'.repeat(1000);
      await logActivity(longUserId, 'POST /api/v1/verify', '192.168.1.1');
      expect(true).toBe(true);
    });
  });
});
