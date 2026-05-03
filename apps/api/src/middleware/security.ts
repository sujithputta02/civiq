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
const CSRF_TOKEN_TTL = 3600; // 1 hour

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
    logger.warn(
      { userId, expected: storedFingerprint.deviceId, received: currentFingerprint },
      'Potential session hijacking detected'
    );
    return false;
  }

  // Check if User-Agent changed (strong indicator of hijacking)
  if (storedFingerprint.userAgent !== (req.headers['user-agent'] || '')) {
    logger.warn({ userId }, 'User-Agent changed for user');
    return false;
  }

  // Check if IP address changed significantly (optional but recommended)
  const currentIp = (req.ip || req.socket?.remoteAddress || '').toString();
  if (storedFingerprint.ipAddress !== currentIp) {
    logger.warn(
      { userId, storedIp: storedFingerprint.ipAddress, currentIp },
      'IP address changed for user session'
    );
    // Don't fail immediately, but log for monitoring
  }

  // Update timestamp and extend TTL
  storedFingerprint.timestamp = Date.now();
  storedFingerprint.ipAddress = currentIp; // Update IP for tracking
  await redis.set(sessionKey, JSON.stringify(storedFingerprint), 'EX', SESSION_TTL);

  return true;
}

/**
 * Middleware to validate session security
 */
export async function validateSessionSecurity(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as any).user as { uid: string } | undefined;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const deviceFingerprint = generateDeviceFingerprint(req);
    const isValid = await validateSessionFingerprint(req, user.uid, deviceFingerprint);

    if (!isValid) {
      logger.error({ userId: user.uid, ip: req.ip }, 'Session hijacking attempt blocked');
      res.status(401).json({ error: 'Session invalid. Please log in again.' });
      return;
    }

    (req as any).deviceFingerprint = deviceFingerprint;
    next();
  } catch (error) {
    logger.error({ error, userId: (req as any).user?.uid }, 'Session security validation error');
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
export async function logActivity(
  userId: string,
  action: string,
  ipAddress: string
): Promise<void> {
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

  const recentLogs = logs.map((l) => JSON.parse(l) as ActivityLog);
  const now = Date.now();
  const timeWindow = 60 * 1000; // 1 minute

  const recentInWindow = recentLogs.filter((log) => now - log.timestamp < timeWindow);
  if (recentInWindow.length < 5) return false;

  const uniqueIps = new Set(recentInWindow.map((log) => log.ipAddress));
  if (uniqueIps.size > 1) {
    logger.warn({ userId, uniqueIps: Array.from(uniqueIps) }, 'Suspicious activity detected: Multiple IPs in short time');
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
      logger.error({ userId: user.uid, ip: req.ip, path: req.path }, 'Blocking suspicious activity');
      res.status(403).json({ error: 'Suspicious activity detected. Please verify your identity.' });
      return;
    }

    next();
  } catch (error) {
    logger.error({ error }, 'Suspicious activity detection error');
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

/**
 * Generate a cryptographically signed session token
 */
export function generateSecureSessionToken(userId: string, expiresIn: number = 3600): string {
  const payload = {
    userId,
    issuedAt: Date.now(),
    expiresAt: Date.now() + expiresIn * 1000,
    nonce: crypto.randomBytes(16).toString('hex'),
  };
  
  const payloadStr = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', process.env.SESSION_SECRET || 'fallback-secret-change-in-production')
    .update(payloadStr)
    .digest('hex');
  
  const token = {
    payload,
    signature,
  };
  
  return Buffer.from(JSON.stringify(token)).toString('base64');
}

/**
 * Validate session token signature and expiration
 */
export function validateSessionToken(token: string): { valid: boolean; userId?: string } {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    const { payload, signature } = decoded;
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.SESSION_SECRET || 'fallback-secret-change-in-production')
      .update(JSON.stringify(payload))
      .digest('hex');
    
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: false };
    }
    
    // Check expiration
    if (payload.expiresAt <= Date.now()) {
      return { valid: false };
    }
    
    return { valid: true, userId: payload.userId };
  } catch {
    return { valid: false };
  }
}

/**
 * Validate session token expiration (legacy - kept for backward compatibility)
 */
export function validateSessionTokenExpiration(token: string): boolean {
  return validateSessionToken(token).valid;
}

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store CSRF token in Redis for a user session
 */
export async function storeCsrfToken(userId: string, token: string): Promise<void> {
  const key = `csrf:${userId}`;
  await redis.set(key, token, 'EX', CSRF_TOKEN_TTL);
}

/**
 * Validate CSRF token against stored value
 */
export async function validateCsrfToken(userId: string, token: string): Promise<boolean> {
  try {
    const key = `csrf:${userId}`;
    const storedToken = await redis.get(key);
    
    if (!storedToken || !token) {
      return false;
    }
    
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(storedToken));
  } catch {
    return false;
  }
}

/**
 * CSRF protection middleware
 */
export async function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Only apply to state-changing methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    next();
    return;
  }

  try {
    const user = (req as any).user as { uid: string } | undefined;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const csrfToken = req.headers['x-csrf-token'] as string;
    if (!csrfToken) {
      res.status(403).json({ error: 'CSRF token missing' });
      return;
    }

    const isValid = await validateCsrfToken(user.uid, csrfToken);
    if (!isValid) {
      logger.warn({ userId: user.uid }, 'Invalid CSRF token');
      res.status(403).json({ error: 'Invalid CSRF token' });
      return;
    }

    next();
  } catch (error) {
    logger.error({ error }, 'CSRF validation error');
    res.status(500).json({ error: 'CSRF validation failed' });
  }
}
