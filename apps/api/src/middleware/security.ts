import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Session security middleware to prevent hijacking
 * Implements:
 * - Device fingerprinting
 * - IP address validation
 * - User-Agent validation
 * - Token rotation
 * - Suspicious activity detection
 */

interface SessionFingerprint {
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: number;
}

// In-memory store for session fingerprints (use Redis in production)
const sessionStore = new Map<string, SessionFingerprint>();

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

  const fingerprint = crypto.createHash('sha256').update(components.join('|')).digest('hex');

  return fingerprint;
}

/**
 * Validate session fingerprint to detect hijacking attempts
 */
export function validateSessionFingerprint(
  req: Request,
  userId: string,
  currentFingerprint: string
): boolean {
  const sessionKey = `${userId}:fingerprint`;
  const storedFingerprint = sessionStore.get(sessionKey);

  if (!storedFingerprint) {
    // First time - store the fingerprint
    sessionStore.set(sessionKey, {
      deviceId: currentFingerprint,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      timestamp: Date.now(),
    });
    return true;
  }

  // Check if fingerprint matches
  if (storedFingerprint.deviceId !== currentFingerprint) {
    console.warn(`Potential session hijacking detected for user ${userId}`);
    console.warn(`Expected fingerprint: ${storedFingerprint.deviceId}`);
    console.warn(`Received fingerprint: ${currentFingerprint}`);
    return false;
  }

  // Check if IP address changed significantly (allow some variance for mobile users)
  const ipChanged = storedFingerprint.ipAddress !== (req.ip || '');
  if (ipChanged) {
    console.warn(
      `IP address changed for user ${userId}: ${storedFingerprint.ipAddress} -> ${req.ip}`
    );
    // Don't fail immediately, but log for monitoring
  }

  // Check if User-Agent changed (strong indicator of hijacking)
  if (storedFingerprint.userAgent !== (req.headers['user-agent'] || '')) {
    console.warn(`User-Agent changed for user ${userId}`);
    return false;
  }

  // Update timestamp
  storedFingerprint.timestamp = Date.now();

  return true;
}

/**
 * Middleware to validate session security
 */
export function validateSessionSecurity(req: Request, res: Response, next: NextFunction): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user as { uid: string } | undefined;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const deviceFingerprint = generateDeviceFingerprint(req);
    const isValid = validateSessionFingerprint(req, user.uid, deviceFingerprint);

    if (!isValid) {
      // eslint-disable-next-line no-console
      console.error(`Session hijacking attempt detected for user ${user.uid}`);
      res.status(401).json({ error: 'Session invalid. Please log in again.' });
      return;
    }

    // Attach fingerprint to request for logging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).deviceFingerprint = deviceFingerprint;
    next();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Session security validation error:', error);
    res.status(500).json({ error: 'Security validation failed' });
  }
}

/**
 * Clear session on logout
 */
export function clearSession(userId: string): void {
  const sessionKey = `${userId}:fingerprint`;
  sessionStore.delete(sessionKey);
  // eslint-disable-next-line no-console
  console.log(`Session cleared for user ${userId}`);
}

/**
 * Clear activity logs for user (for testing)
 */
export function clearActivityLogs(userId?: string): void {
  if (userId) {
    activityLogs.delete(userId);
  } else {
    activityLogs.clear();
  }
}

/**
 * Detect suspicious activity patterns
 */
interface ActivityLog {
  userId: string;
  action: string;
  timestamp: number;
  ipAddress: string;
}

const activityLogs = new Map<string, ActivityLog[]>();

export function logActivity(userId: string, action: string, ipAddress: string): void {
  const key = userId;
  if (!activityLogs.has(key)) {
    activityLogs.set(key, []);
  }

  const logs = activityLogs.get(key)!;
  logs.push({
    userId,
    action,
    timestamp: Date.now(),
    ipAddress,
  });

  // Keep only last 100 activities per user
  if (logs.length > 100) {
    logs.shift();
  }
}

/**
 * Detect rapid-fire requests from different IPs (potential account takeover)
 */
export function detectSuspiciousActivity(userId: string): boolean {
  const logs = activityLogs.get(userId) || [];
  if (logs.length < 5) return false;

  // Check last 5 requests
  const recentLogs = logs.slice(-5);
  const now = Date.now();
  const timeWindow = 60 * 1000; // 1 minute

  // Get logs within last minute
  const recentInWindow = recentLogs.filter((log) => now - log.timestamp < timeWindow);

  if (recentInWindow.length < 5) return false;

  // Check if requests are from different IPs
  const uniqueIps = new Set(recentInWindow.map((log) => log.ipAddress));
  if (uniqueIps.size > 1) {
    // eslint-disable-next-line no-console
    console.warn(`Suspicious activity detected for user ${userId}: Multiple IPs in short time`);
    return true;
  }

  return false;
}

/**
 * Middleware to detect and block suspicious activity
 */
export function detectSuspiciousActivityMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user as { uid: string } | undefined;
    if (!user) {
      next();
      return;
    }

    // Log the activity
    logActivity(user.uid, req.method + ' ' + req.path, req.ip || '');

    // Check for suspicious patterns
    if (detectSuspiciousActivity(user.uid)) {
      // eslint-disable-next-line no-console
      console.error(`Blocking suspicious activity for user ${user.uid}`);
      res.status(403).json({ error: 'Suspicious activity detected. Please verify your identity.' });
      return;
    }

    next();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Suspicious activity detection error:', error);
    next();
  }
}

/**
 * Generate secure session token with expiration
 */
export function generateSecureSessionToken(userId: string, expiresIn: number = 3600): string {
  const payload = {
    userId,
    issuedAt: Date.now(),
    expiresAt: Date.now() + expiresIn * 1000,
    nonce: crypto.randomBytes(16).toString('hex'),
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Validate session token expiration
 */
export function validateSessionTokenExpiration(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    return payload.expiresAt > Date.now();
  } catch {
    return false;
  }
}

/**
 * Implement CSRF token validation
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCsrfToken(token: string, storedToken: string): boolean {
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(storedToken));
}
