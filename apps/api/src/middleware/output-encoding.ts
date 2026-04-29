import { Request, Response, NextFunction } from 'express';

/**
 * Output Encoding & Sanitization Middleware
 * Prevents XSS and injection attacks in responses
 */

/**
 * Encode HTML special characters
 */
export function encodeHtml(str: string): string {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const map: Record<string, string> = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '&': '&amp;',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '<': '&lt;',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '>': '&gt;',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '"': '&quot;',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "'": '&#39;',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '/': '&#x2F;',
  };
  // eslint-disable-next-line no-useless-escape
  return str.replace(/[&<>"'\/]/g, (char) => map[char]);
}

/**
 * Encode JSON for safe embedding in HTML
 */
export function encodeJson(obj: unknown): string {
  const json = JSON.stringify(obj);
  return encodeHtml(json);
}

/**
 * Sanitize response data recursively
 */
export function sanitizeResponseData(data: unknown, visited = new WeakSet()): unknown {
  if (typeof data === 'string') {
    return encodeHtml(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeResponseData(item, visited));
  }

  if (data !== null && typeof data === 'object') {
    // Check for circular references
    if (visited.has(data as object)) {
      return '[Circular]';
    }

    visited.add(data as object);

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Sanitize key and value
      const sanitizedKey = encodeHtml(key);
      sanitized[sanitizedKey] = sanitizeResponseData(value, visited);
    }
    return sanitized;
  }

  return data;
}

/**
 * Middleware to set secure response headers
 */
export function secureResponseHeaders(_req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Strict Transport Security
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Content Security Policy - Strict
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://generativelanguage.googleapis.com https://api.tavily.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  // Remove server header
  res.removeHeader('Server');
  res.removeHeader('X-Powered-By');

  next();
}

/**
 * Middleware to sanitize JSON responses
 */
export function sanitizeJsonResponse(_req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json;

  res.json = function (data: unknown) {
    // Sanitize the response data
    const sanitized = sanitizeResponseData(data);

    // Call original json with sanitized data
    return originalJson.call(this, sanitized);
  };

  next();
}

/**
 * Prevent response splitting attacks
 */
export function preventResponseSplitting(_req: Request, res: Response, next: NextFunction): void {
  const originalSetHeader = res.setHeader;

  res.setHeader = function (name: string, value: string | number | readonly string[]) {
    // Check for CRLF injection
    if (typeof value === 'string' && /[\r\n]/.test(value)) {
      // eslint-disable-next-line no-console
      console.warn(`Potential response splitting attack detected in header: ${name}`);
      throw new Error('Invalid header value');
    }

    return originalSetHeader.call(this, name, value);
  };

  next();
}
