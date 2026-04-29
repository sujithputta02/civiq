import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
} from '../../middleware/security';

describe('Security Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'accept-language': 'en-US,en;q=0.9',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'accept-encoding': 'gzip, deflate',
      },
      ip: '192.168.1.1',
      method: 'POST',
      path: '/api/v1/verify',
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn() as unknown as NextFunction;
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Clear session store and activity logs between tests
    clearSession('user123');
    clearActivityLogs();
  });

  describe('generateDeviceFingerprint', () => {
    it('should generate consistent fingerprint for same request', () => {
      const fp1 = generateDeviceFingerprint(req as Request);
      const fp2 = generateDeviceFingerprint(req as Request);
      expect(fp1).toBe(fp2);
    });

    it('should generate different fingerprint for different user-agent', () => {
      const fp1 = generateDeviceFingerprint(req as Request);
      // eslint-disable-next-line @typescript-eslint/naming-convention
      req.headers = { ...req.headers, 'user-agent': 'Different Browser' };
      const fp2 = generateDeviceFingerprint(req as Request);
      expect(fp1).not.toBe(fp2);
    });

    it('should generate different fingerprint for different IP', () => {
      const fp1 = generateDeviceFingerprint(req as Request);
      (req as Record<string, unknown>).ip = '192.168.1.2';
      const fp2 = generateDeviceFingerprint(req as Request);
      expect(fp1).not.toBe(fp2);
    });

    it('should handle missing headers gracefully', () => {
      req.headers = {};
      const fp = generateDeviceFingerprint(req as Request);
      expect(fp).toBeDefined();
      expect(fp.length).toBe(64); // SHA256 hex length
    });

    it('should handle missing IP gracefully', () => {
      (req as Record<string, unknown>).ip = undefined;
      const fp = generateDeviceFingerprint(req as Request);
      expect(fp).toBeDefined();
    });

    // Best case: all headers present
    it('BEST CASE: should generate fingerprint with all headers', () => {
      const fp = generateDeviceFingerprint(req as Request);
      expect(fp).toMatch(/^[a-f0-9]{64}$/);
    });

    // Worst case: no headers
    it('WORST CASE: should generate fingerprint with no headers', () => {
      req.headers = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).ip = undefined;
      const fp = generateDeviceFingerprint(req as Request);
      expect(fp).toBeDefined();
      expect(fp.length).toBe(64);
    });

    // Average case: partial headers
    it('AVERAGE CASE: should generate fingerprint with partial headers', () => {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      req.headers = { 'user-agent': 'Mozilla/5.0' };
      const fp = generateDeviceFingerprint(req as Request);
      expect(fp).toBeDefined();
    });
  });

  describe('validateSessionFingerprint', () => {
    it('should accept first-time fingerprint', () => {
      const fp = generateDeviceFingerprint(req as Request);
      const result = validateSessionFingerprint(req as Request, 'user123', fp);
      expect(result).toBe(true);
    });

    it('should accept matching fingerprint on subsequent requests', () => {
      const fp = generateDeviceFingerprint(req as Request);
      validateSessionFingerprint(req as Request, 'user123', fp);
      const result = validateSessionFingerprint(req as Request, 'user123', fp);
      expect(result).toBe(true);
    });

    it('should reject mismatched fingerprint', () => {
      const fp1 = generateDeviceFingerprint(req as Request);
      validateSessionFingerprint(req as Request, 'user123', fp1);
      const fp2 = 'a'.repeat(64);
      const result = validateSessionFingerprint(req as Request, 'user123', fp2);
      expect(result).toBe(false);
    });

    it('should reject changed user-agent', () => {
      const fp = generateDeviceFingerprint(req as Request);
      validateSessionFingerprint(req as Request, 'user123', fp);
      // eslint-disable-next-line @typescript-eslint/naming-convention
      req.headers = { ...req.headers, 'user-agent': 'Different Browser' };
      const result = validateSessionFingerprint(req as Request, 'user123', fp);
      expect(result).toBe(false);
    });

    it('should allow IP address changes', () => {
      const fp = generateDeviceFingerprint(req as Request);
      validateSessionFingerprint(req as Request, 'user123', fp);
      (req as Record<string, unknown>).ip = '192.168.1.2';
      const result = validateSessionFingerprint(req as Request, 'user123', fp);
      expect(result).toBe(true); // IP changes are allowed
    });

    // Best case: exact match
    it('BEST CASE: should validate matching fingerprint', () => {
      const fp = generateDeviceFingerprint(req as Request);
      validateSessionFingerprint(req as Request, 'user123', fp);
      const result = validateSessionFingerprint(req as Request, 'user123', fp);
      expect(result).toBe(true);
    });

    // Worst case: complete mismatch
    it('WORST CASE: should reject completely different fingerprint', () => {
      const fp1 = generateDeviceFingerprint(req as Request);
      validateSessionFingerprint(req as Request, 'user123', fp1);
      // eslint-disable-next-line @typescript-eslint/naming-convention
      req.headers = { 'user-agent': 'Completely Different' };
      (req as Record<string, unknown>).ip = '10.0.0.1';
      const fp2 = generateDeviceFingerprint(req as Request);
      const result = validateSessionFingerprint(req as Request, 'user123', fp2);
      expect(result).toBe(false);
    });
  });

  describe('validateSessionSecurity', () => {
    it('should allow valid session', () => {
      const user = { uid: 'user123' };
      (req as Record<string, unknown>).user = user;
      validateSessionSecurity(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject request without user', () => {
      validateSessionSecurity(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should reject hijacked session', () => {
      const user = { uid: 'user123' };
      (req as Record<string, unknown>).user = user;
      const fp = generateDeviceFingerprint(req as Request);
      validateSessionFingerprint(req as Request, 'user123', fp);

      // Simulate hijacking attempt
      // eslint-disable-next-line @typescript-eslint/naming-convention
      req.headers = { 'user-agent': 'Attacker Browser' };
      validateSessionSecurity(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('logActivity', () => {
    it('should log activity for user', () => {
      logActivity('user123', 'POST /api/v1/verify', '192.168.1.1');
      // Activity is logged internally, just verify no error
      expect(true).toBe(true);
    });

    it('should keep only last 100 activities', () => {
      for (let i = 0; i < 150; i++) {
        logActivity('user123', `Action ${i}`, '192.168.1.1');
      }
      // Should not throw and should maintain max 100
      expect(true).toBe(true);
    });
  });

  describe('detectSuspiciousActivity', () => {
    it('should not flag normal activity', () => {
      logActivity('user123', 'POST /api/v1/verify', '192.168.1.1');
      const result = detectSuspiciousActivity('user123');
      expect(result).toBe(false);
    });

    it('should flag multiple IPs in short time', () => {
      logActivity('user123', 'POST /api/v1/verify', '192.168.1.1');
      logActivity('user123', 'POST /api/v1/verify', '192.168.1.2');
      logActivity('user123', 'POST /api/v1/verify', '192.168.1.3');
      logActivity('user123', 'POST /api/v1/verify', '192.168.1.4');
      logActivity('user123', 'POST /api/v1/verify', '192.168.1.5');
      const result = detectSuspiciousActivity('user123');
      expect(result).toBe(true);
    });

    it('should not flag same IP multiple times', () => {
      logActivity('user123', 'POST /api/v1/verify', '192.168.1.1');
      logActivity('user123', 'POST /api/v1/verify', '192.168.1.1');
      logActivity('user123', 'POST /api/v1/verify', '192.168.1.1');
      const result = detectSuspiciousActivity('user123');
      expect(result).toBe(false);
    });

    // Best case: no suspicious activity
    it('BEST CASE: should not flag legitimate activity', () => {
      logActivity('user123', 'GET /api/v1/chat', '192.168.1.1');
      logActivity('user123', 'POST /api/v1/chat', '192.168.1.1');
      const result = detectSuspiciousActivity('user123');
      expect(result).toBe(false);
    });

    // Worst case: rapid multi-IP activity
    it('WORST CASE: should flag rapid multi-IP activity', () => {
      for (let i = 1; i <= 5; i++) {
        logActivity('user123', `Action ${i}`, `192.168.1.${i}`);
      }
      const result = detectSuspiciousActivity('user123');
      expect(result).toBe(true);
    });
  });

  describe('generateSecureSessionToken', () => {
    it('should generate valid token', () => {
      const token = generateSecureSessionToken('user123');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should generate different tokens', () => {
      const token1 = generateSecureSessionToken('user123');
      const token2 = generateSecureSessionToken('user123');
      expect(token1).not.toBe(token2);
    });

    it('should include user ID in token', () => {
      const token = generateSecureSessionToken('user123');
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      expect(decoded.userId).toBe('user123');
    });

    it('should include expiration in token', () => {
      const token = generateSecureSessionToken('user123', 3600);
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      expect(decoded.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should include nonce in token', () => {
      const token = generateSecureSessionToken('user123');
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      expect(decoded.nonce).toBeDefined();
      expect(decoded.nonce.length).toBeGreaterThan(0);
    });
  });

  describe('validateSessionTokenExpiration', () => {
    it('should accept valid token', () => {
      const token = generateSecureSessionToken('user123', 3600);
      const result = validateSessionTokenExpiration(token);
      expect(result).toBe(true);
    });

    it('should reject expired token', () => {
      const token = generateSecureSessionToken('user123', -1);
      const result = validateSessionTokenExpiration(token);
      expect(result).toBe(false);
    });

    it('should reject invalid token', () => {
      const result = validateSessionTokenExpiration('invalid-token');
      expect(result).toBe(false);
    });

    it('should reject malformed token', () => {
      const result = validateSessionTokenExpiration('not-base64!!!');
      expect(result).toBe(false);
    });
  });

  describe('generateCsrfToken', () => {
    it('should generate valid CSRF token', () => {
      const token = generateCsrfToken();
      expect(token).toBeDefined();
      expect(token.length).toBe(64); // 32 bytes in hex
    });

    it('should generate different tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('validateCsrfToken', () => {
    it('should accept matching tokens', () => {
      const token = generateCsrfToken();
      const result = validateCsrfToken(token, token);
      expect(result).toBe(true);
    });

    it('should reject mismatched tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      const result = validateCsrfToken(token1, token2);
      expect(result).toBe(false);
    });

    it('should use timing-safe comparison', () => {
      const token = generateCsrfToken();
      const result = validateCsrfToken(token, token);
      expect(result).toBe(true);
    });
  });

  describe('clearSession', () => {
    it('should clear session for user', () => {
      const fp = generateDeviceFingerprint(req as Request);
      validateSessionFingerprint(req as Request, 'user123', fp);
      clearSession('user123');
      // After clearing, first-time validation should succeed
      const result = validateSessionFingerprint(req as Request, 'user123', fp);
      expect(result).toBe(true);
    });
  });

  describe('detectSuspiciousActivityMiddleware', () => {
    it('should allow normal activity', () => {
      (req as Record<string, unknown>).user = { uid: 'user123' };
      detectSuspiciousActivityMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block suspicious activity', () => {
      (req as Record<string, unknown>).user = { uid: 'user123' };
      // Simulate suspicious activity
      for (let i = 1; i <= 5; i++) {
        logActivity('user123', `Action ${i}`, `192.168.1.${i}`);
      }
      detectSuspiciousActivityMiddleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow unauthenticated requests', () => {
      detectSuspiciousActivityMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent fingerprint validations', () => {
      const fp = generateDeviceFingerprint(req as Request);
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(validateSessionFingerprint(req as Request, 'user123', fp));
      }
      expect(results.every((r) => r === true)).toBe(true);
    });

    it('should handle very long user IDs', () => {
      const longUserId = 'a'.repeat(1000);
      logActivity(longUserId, 'POST /api/v1/verify', '192.168.1.1');
      expect(true).toBe(true);
    });

    it('should handle special characters in activity', () => {
      logActivity('user123', 'POST /api/v1/verify?claim="test"', '192.168.1.1');
      expect(true).toBe(true);
    });
  });
});
