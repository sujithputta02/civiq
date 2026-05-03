/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { logSecurityEvent } from '../modules/security/audit.service.js';
import logger from '../utils/logger.js';
import * as admin from 'firebase-admin';

/**
 * Enhanced Threat Detection & Rate Limiting (Layer 15)
 * Runtime analysis of request patterns to block bots and exploit attempts.
 */

interface SecurityRequest extends Request {
  threatScore?: number;
  threatFactors?: string[];
  user?: admin.auth.DecodedIdToken;
}

const THREAT_BLOCK_THRESHOLD = 0.8;
const AUTH_FAILURE_LIMIT = 5;
const IP_VELOCITY_LIMIT = 100;

const authFailures = new Map<string, number>();
const ipRequests = new Map<string, number>();
const blockedIps = new Set<string>();

/**
 * Track authentication failures per IP
 */
export function recordAuthFailure(ip: string): void {
  const count = (authFailures.get(ip) || 0) + 1;
  authFailures.set(ip, count);
}

export function blockIp(ip: string): void { blockedIps.add(ip); }
export function unblockIp(ip: string): void { blockedIps.delete(ip); }
export function getAuthFailureCount(ip: string): number { return authFailures.get(ip) || 0; }
export function getIpRequestCount(ip: string): number { return ipRequests.get(ip) || 0; }
export function isIpBlocked(ip: string): boolean { return blockedIps.has(ip); }

/**
 * Reset all threat detection state
 */
export function resetThreatCounters(): void {
  authFailures.clear();
  ipRequests.clear();
  blockedIps.clear();
}

/**
 * Calculate risk score based on request patterns
 */
export function calculateThreatScore(req: Request): { score: number; factors: string[] } {
  const factors: string[] = [];
  let score = 0;
  const ip = req.ip || 'unknown';

  // 0. Instant high score for permanently blocked IPs
  if (blockedIps.has(ip)) {
    return { score: 1.0, factors: ['permanently-blocked-ip'] };
  }

  // 1. IP Velocity Tracking
  const reqCount = (ipRequests.get(ip) || 0) + 1;
  ipRequests.set(ip, reqCount);
  if (reqCount > IP_VELOCITY_LIMIT) {
    score += 0.5;
    factors.push(`ip-velocity:${reqCount}`);
  }

  // 2. Auth Failure History
  const failures = authFailures.get(ip) || 0;
  if (failures >= AUTH_FAILURE_LIMIT) {
    score += 0.4;
    factors.push(`auth-failures:${failures}`);
  }

  // 3. User-Agent Analysis
  const userAgent = (req.headers['user-agent'] as string) || '';
  if (!userAgent) {
    score += 0.2;
    factors.push('missing-user-agent');
  } else if (/sqlmap|nuclei|goby|nmap|nikto/i.test(userAgent)) {
    score += 0.5;
    factors.push('malicious-user-agent');
  }

  // 4. Path Injection Patterns
  const path = req.originalUrl || req.path || '';
  if (/\.\.\/|etc\/passwd|union\s+select|select\s+.*\s+from/i.test(path)) {
    score += 0.6;
    factors.push('path-injection-pattern');
  }

  return { score: Math.min(score, 1.0), factors };
}

/**
 * Threat Detection Middleware
 */
export function threatDetectionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip = req.ip || 'unknown';

  const { score, factors } = calculateThreatScore(req);
  const sReq = req as SecurityRequest;
  sReq.threatScore = score;
  sReq.threatFactors = factors;

  if (score >= THREAT_BLOCK_THRESHOLD) {
    blockedIps.add(ip);
    
    logSecurityEvent(
      'SUSPICIOUS_ACTIVITY',
      sReq.user?.uid || ip,
      {
        ip,
        score,
        factors,
        path: req.originalUrl,
        userAgent: req.headers['user-agent']
      },
      'HIGH'
    ).catch(err => logger.error(err, 'Failed to log threat event'));

    // Test expects 429 and "restricted" in error message
    res.status(429).json({ 
      error: 'Access restricted due to high threat score',
      score,
      factors 
    });
    return;
  }

  next();
}
