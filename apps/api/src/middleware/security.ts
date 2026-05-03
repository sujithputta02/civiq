import { Request, Response, NextFunction } from 'express';
/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto';
import redis from '../modules/shared/redis.service.js';
import logger from '../utils/logger.js';

/**
 * Session security middleware to prevent hijacking
 */

interface SessionFingerprint {
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: number;
}

interface ActivityLog {
  userId: string;
  action: string;
  timestamp: number;
  ipAddress: string;
}

const SESSION_TTL = 3600; // 1 hour

/**
 * Generate a device fingerprint based on request characteristics
 */
export function generateDeviceFingerprint(req: Request): string {
  const components = [
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.headers['accept-encoding'] || '',
    req.ip || req.socket?.remoteAddress || '',
  ];

  return crypto.createHash('sha256').update(components.join('|')).digest('hex');
}

/**
 * Validate session fingerprint to detect hijacking attempts
 */
export async function validateSessionFingerprint(
  req: Request,
  userId: string,
  currentFingerprint: string
): Promise<boolean> {
  const sessionKey = `session:${userId}:fingerprint`;
  const storedData = await redis.get(sessionKey);

  if (!storedData) {
    // First time - store the fingerprint
    const fingerprint: SessionFingerprint = {
      deviceId: currentFingerprint,
      ipAddress: (req.ip || req.socket?.remoteAddress || '').toString(),
      userAgent: req.headers['user-agent'] || '',
      timestamp: Date.now(),
    };
    await redis.set(sessionKey, JSON.stringify(fingerprint), 'EX', SESSION_TTL);
    return true;
  }

  const storedFingerprint = JSON.parse(storedData) as SessionFingerprint;

  // Check if fingerprint matches
  if (storedFingerprint.deviceId !== currentFingerprint) {
    logger.warn({ userId, expected: storedFingerprint.deviceId, received: currentFingerprint }, 'Potential session hijacking detected');
    return false;
  }

  // Check if User-Agent changed (strong indicator of hijacking)
  if (storedFingerprint.userAgent !== (req.headers['user-agent'] || '')) {
    logger.warn({ userId }, 'User-Agent changed for user');
    return false;
  }

  // Update timestamp and extend TTL
  storedFingerprint.timestamp = Date.now();
  await redis.set(sessionKey, JSON.stringify(storedFingerprint), 'EX', SESSION_TTL);

  return true;
}

/**
 * Middleware to validate session security
 */
export async function validateSessionSecurity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user as { uid: string } | undefined;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const deviceFingerprint = generateDeviceFingerprint(req);
    const isValid = await validateSessionFingerprint(req, user.uid, deviceFingerprint);

    if (!isValid) {
      logger.error({ userId: user.uid }, 'Session hijacking attempt blocked');
      res.status(401).json({ error: 'Session invalid. Please log in again.' });
      return;
    }

    (req as any).deviceFingerprint = deviceFingerprint;
    next();
  } catch (error) {
    logger.error(error, 'Session security validation error');
    res.status(500).json({ error: 'Security validation failed' });
  }
}

/**
 * Clear session on logout
 */
export async function clearSession(userId: string): Promise<void> {
  const sessionKey = `session:${userId}:fingerprint`;
  await redis.del(sessionKey);
  logger.info({ userId }, 'Session cleared');
}

/**
 * Detect suspicious activity patterns using Redis
 */
export async function logActivity(userId: string, action: string, ipAddress: string): Promise<void> {
  const key = `activity:${userId}`;
  const log = JSON.stringify({
    userId,
    action,
    timestamp: Date.now(),
    ipAddress,
  });

  await redis.lpush(key, log);
  await redis.ltrim(key, 0, 99); // Keep only last 100
  await redis.expire(key, 86400); // 24h retention
}

export async function detectSuspiciousActivity(userId: string): Promise<boolean> {
  const key = `activity:${userId}`;
  const logs = await redis.lrange(key, 0, 4);
  if (logs.length < 5) return false;

  const recentLogs = logs.map(l => JSON.parse(l) as ActivityLog);
  const now = Date.now();
  const timeWindow = 60 * 1000; // 1 minute

  const recentInWindow = recentLogs.filter((log) => now - log.timestamp < timeWindow);
  if (recentInWindow.length < 5) return false;

  const uniqueIps = new Set(recentInWindow.map((log) => log.ipAddress));
  if (uniqueIps.size > 1) {
    logger.warn({ userId }, 'Suspicious activity detected: Multiple IPs in short time');
    return true;
  }

  return false;
}

export async function detectSuspiciousActivityMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as any).user as { uid: string } | undefined;
    if (!user) {
      next();
      return;
    }

    await logActivity(user.uid, `${req.method} ${req.path}`, req.ip || '');

    if (await detectSuspiciousActivity(user.uid)) {
      logger.error({ userId: user.uid }, 'Blocking suspicious activity');
      res.status(403).json({ error: 'Suspicious activity detected. Please verify your identity.' });
      return;
    }

    next();
  } catch (error) {
    logger.error(error, 'Suspicious activity detection error');
    next();
  }
}

/**
 * Clear activity logs for a user (for tests/maintenance)
 */
export async function clearActivityLogs(userId: string): Promise<void> {
  const key = `activity:${userId}`;
  await redis.del(key);
}

export function generateSecureSessionToken(userId: string, expiresIn: number = 3600): string {
  const payload = {
    userId,
    issuedAt: Date.now(),
    expiresAt: Date.now() + expiresIn * 1000,
    nonce: crypto.randomBytes(16).toString('hex'),
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function validateSessionTokenExpiration(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    return payload.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCsrfToken(token: string, storedToken: string): boolean {
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(storedToken));
}
