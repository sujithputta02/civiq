import { Request, Response, NextFunction } from 'express';
/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from '../utils/logger.js';

/**
 * Output Encoding & Sanitization Middleware
 * Prevents XSS and injection attacks in responses
 */

/**
 * Encode HTML special characters
 */
export function encodeHtml(str: string): string {
  /* eslint-disable @typescript-eslint/naming-convention */
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };
  /* eslint-enable @typescript-eslint/naming-convention */
  return str.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Encode JSON for safe embedding in HTML
 */
export function encodeJson(obj: unknown): string {
  const json = JSON.stringify(obj);
  return encodeHtml(json);
}

/**
 * Recursively sanitize data structures
 */
export function sanitizeResponseData(data: unknown, seen = new WeakSet()): unknown {
  if (typeof data === 'string') {
    return encodeHtml(data);
  }

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (seen.has(data)) {
    return '[Circular]';
  }
  seen.add(data);

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeResponseData(item, seen));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const sanitizedKey = encodeHtml(key);
    sanitized[sanitizedKey] = sanitizeResponseData(value, seen);
  }
  return sanitized;
}

/**
 * Middleware to sanitize JSON responses
 */
export function sanitizeJsonResponse(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalJson = res.json;

  res.json = function (body: unknown): Response {
    const sanitizedBody = sanitizeResponseData(body);
    return originalJson.call(this, sanitizedBody);
  };

  next();
}

/**
 * Middleware to prevent Response Splitting
 */
export function preventResponseSplitting(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalSetHeader = res.setHeader;

  res.setHeader = function (name: string, value: string | number | readonly string[]): Response {
    if (typeof value === 'string' && /[\r\n]/.test(value)) {
      logger.error({ name, value }, 'Response splitting attempt blocked');
      throw new Error('CRLF Injection detected');
    }
    return originalSetHeader.call(this, name, value) as unknown as Response;
  };

  next();
}

/**
 * Security headers for response integrity
 */
export function secureResponseHeaders(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=()');
  res.removeHeader('Server');
  res.removeHeader('X-Powered-By');
  next();
}

/**
 * Utility to encode redirect URLs
 */
export function safeRedirect(res: Response, url: string): void {
  const sanitizedUrl = url.replace(/[\r\n]/g, '');
  if (!sanitizedUrl.startsWith('/') && !sanitizedUrl.startsWith(process.env.FRONTEND_URL || '')) {
    logger.warn({ url }, 'Potentially unsafe redirect blocked');
    res.redirect('/');
    return;
  }
  res.redirect(sanitizedUrl);
}
