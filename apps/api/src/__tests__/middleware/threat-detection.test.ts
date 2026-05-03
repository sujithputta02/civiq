/**
 * Test Suite: Layer 15 – Runtime Threat Detection (WAF-lite)
 * 14 tests covering IP velocity, auth failure accumulation, UA fingerprinting,
 * path injection, threat score calculation, and middleware responses.
 */

/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-explicit-any */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  calculateThreatScore,
  recordAuthFailure,
  blockIp,
  unblockIp,
  getIpRequestCount,
  getAuthFailureCount,
  threatDetectionMiddleware,
  resetThreatCounters,
} from '../../middleware/threat-detection.js';

// Silence audit service in tests
vi.mock('../../modules/security/audit.service.js', () => ({
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    ip: '1.2.3.4',
    socket: { remoteAddress: '1.2.3.4' },
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; Civiq/1.0)',
      'accept-language': 'en-US,en;q=0.9',
      'accept-encoding': 'gzip, deflate, br',
      'content-length': '100',
    },
    originalUrl: '/api/v1/verify',
    path: '/api/v1/verify',
    method: 'POST',
    ...overrides,
  } as unknown as Request;
}

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Layer 15: Runtime Threat Detection Middleware', () => {
  beforeEach(() => {
    resetThreatCounters();
    vi.clearAllMocks();
  });

  // Score calculation – clean requests

  test('L15-01: legitimate request scores below block threshold', () => {
    const { score } = calculateThreatScore(makeReq());
    expect(score).toBeLessThan(0.8);
  });

  // IP velocity

  test('L15-02: normal IP velocity does not elevate score above block threshold', () => {
    const req = makeReq({ ip: '5.6.7.8' });
    for (let i = 0; i < 50; i++) calculateThreatScore(req);
    const { factors } = calculateThreatScore(req);
    expect(factors.some((f) => f.startsWith('ip-velocity:'))).toBe(false);
  });

  test('L15-03: exceeding IP velocity limit raises score significantly', () => {
    const req = makeReq({ ip: '9.10.11.12' });
    for (let i = 0; i < 130; i++) calculateThreatScore(req);
    const { score, factors } = calculateThreatScore(req);
    expect(factors.some((f) => f.startsWith('ip-velocity:'))).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0.5);
  });

  // Auth failure accumulation

  test('L15-04: recordAuthFailure increments the counter', () => {
    recordAuthFailure('20.21.22.23');
    recordAuthFailure('20.21.22.23');
    expect(getAuthFailureCount('20.21.22.23')).toBe(2);
  });

  test('L15-05: 5+ auth failures raises score', () => {
    const ip = '30.31.32.33';
    for (let i = 0; i < 6; i++) recordAuthFailure(ip);
    const { score, factors } = calculateThreatScore(makeReq({ ip }));
    expect(factors.some((f) => f.startsWith('auth-failures:'))).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0.4);
  });

  // Malicious User-Agent

  test('L15-06: sqlmap User-Agent raises score', () => {
    const req = makeReq({
      headers: { 'user-agent': 'sqlmap/1.7' },
    } as Partial<Request>);
    const { score, factors } = calculateThreatScore(req);
    expect(factors).toContain('malicious-user-agent');
    expect(score).toBeGreaterThanOrEqual(0.35);
  });

  test('L15-07: nuclei scanner User-Agent raises score', () => {
    const req = makeReq({
      headers: { 'user-agent': 'nuclei/2.9.1' },
    } as Partial<Request>);
    const { factors } = calculateThreatScore(req);
    expect(factors).toContain('malicious-user-agent');
  });

  test('L15-08: missing User-Agent adds a score penalty', () => {
    const req = makeReq({ headers: {} } as Partial<Request>);
    const { factors } = calculateThreatScore(req);
    expect(factors).toContain('missing-user-agent');
  });

  // Path injection patterns

  test('L15-09: path traversal URL raises score', () => {
    const req = makeReq({
      originalUrl: '/api/v1/../../../etc/passwd',
      path: '/../../../etc/passwd',
    });
    const { factors, score } = calculateThreatScore(req);
    expect(factors).toContain('path-injection-pattern');
    expect(score).toBeGreaterThanOrEqual(0.45);
  });

  test('L15-10: SQL injection in query string raises score', () => {
    const req = makeReq({
      originalUrl: "/api/v1/verify?q=1' UNION SELECT * FROM users",
    });
    const { factors } = calculateThreatScore(req);
    expect(factors).toContain('path-injection-pattern');
  });

  // Permanently blocked IP

  test('L15-11: permanently blocked IP always returns score 1.0', () => {
    const ip = '99.88.77.66';
    blockIp(ip);
    const { score, factors } = calculateThreatScore(makeReq({ ip }));
    expect(score).toBe(1.0);
    expect(factors).toContain('permanently-blocked-ip');
    unblockIp(ip);
  });

  // Middleware behaviour

  test('L15-12: middleware calls next() for safe request', () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    threatDetectionMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('L15-13: middleware returns 429 when threat score ≥ 0.8', () => {
    const ip = '111.222.33.44';
    for (let i = 0; i < 6; i++) recordAuthFailure(ip);
    const req = makeReq({
      ip,
      headers: { 'user-agent': 'sqlmap/1.7' },
      originalUrl: '/api/../../../etc/passwd',
    } as Partial<Request>);
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    threatDetectionMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('restricted') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('L15-14: getIpRequestCount and getAuthFailureCount return 0 after reset', () => {
    recordAuthFailure('200.201.202.203');
    resetThreatCounters();
    expect(getAuthFailureCount('200.201.202.203')).toBe(0);
    expect(getIpRequestCount('200.201.202.203')).toBe(0);
  });
});
