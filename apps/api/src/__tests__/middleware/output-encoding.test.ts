import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  encodeHtml,
  encodeJson,
  sanitizeResponseData,
  secureResponseHeaders,
  sanitizeJsonResponse,
  preventResponseSplitting,
} from '../../middleware/output-encoding.js';

describe('Output Encoding Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {
      setHeader: vi.fn().mockReturnThis(),
      removeHeader: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn() as unknown as NextFunction;
  });

  describe('encodeHtml', () => {
    it('should encode ampersand', () => {
      const result = encodeHtml('Tom & Jerry');
      expect(result).toBe('Tom &amp; Jerry');
    });

    it('should encode less than', () => {
      const result = encodeHtml('5 < 10');
      expect(result).toBe('5 &lt; 10');
    });

    it('should encode greater than', () => {
      const result = encodeHtml('10 > 5');
      expect(result).toBe('10 &gt; 5');
    });

    it('should encode double quotes', () => {
      const result = encodeHtml('He said "hello"');
      expect(result).toBe('He said &quot;hello&quot;');
    });

    it('should encode single quotes', () => {
      const result = encodeHtml("It's a test");
      expect(result).toBe('It&#39;s a test');
    });

    it('should encode forward slash', () => {
      const result = encodeHtml('path/to/file');
      expect(result).toBe('path&#x2F;to&#x2F;file');
    });

    it('should encode all special characters', () => {
      const result = encodeHtml('<script>alert("xss")</script>');
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    it('should not encode safe characters', () => {
      const result = encodeHtml('Hello World 123');
      expect(result).toBe('Hello World 123');
    });

    // Best case: safe text
    it('BEST CASE: encode safe text', () => {
      const result = encodeHtml('Hello World');
      expect(result).toBe('Hello World');
    });

    // Worst case: all special characters
    it('WORST CASE: encode all special characters', () => {
      const result = encodeHtml('&<>"\'/<>');
      expect(result).toContain('&amp;');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&quot;');
      expect(result).toContain('&#39;');
    });
  });

  describe('encodeJson', () => {
    it('should encode JSON with special characters', () => {
      const obj = { message: '<script>alert("xss")</script>' };
      const result = encodeJson(obj);
      expect(result).toContain('&lt;script&gt;');
    });

    it('should handle nested objects', () => {
      const obj = { user: { name: '<img src=x onerror="alert(1)">' } };
      const result = encodeJson(obj);
      expect(result).toContain('&lt;img');
    });

    it('should handle arrays', () => {
      const obj = { items: ['<script>', '<img>'] };
      const result = encodeJson(obj);
      expect(result).toContain('&lt;script&gt;');
    });
  });

  describe('sanitizeResponseData', () => {
    it('should sanitize string values', () => {
      const data = { message: '<script>alert("xss")</script>' };
      const result = sanitizeResponseData(data);
      expect((result as Record<string, unknown>).message).toContain('&lt;script&gt;');
    });

    it('should sanitize array items', () => {
      const data = ['<script>', '<img>'];
      const result = sanitizeResponseData(data);
      expect((result as unknown[])[0]).toContain('&lt;script&gt;');
    });

    it('should sanitize nested objects', () => {
      const data = {
        user: {
          name: '<img src=x>',
          email: 'test@example.com',
        },
      };
      const result = sanitizeResponseData(data);
      expect((result as Record<string, Record<string, unknown>>).user.name).toContain('&lt;img');
    });

    it('should preserve non-string values', () => {
      const data = { count: 42, active: true, value: null };
      const result = sanitizeResponseData(data);
      expect((result as Record<string, unknown>).count).toBe(42);
      expect((result as Record<string, unknown>).active).toBe(true);
      expect((result as Record<string, unknown>).value).toBe(null);
    });

    it('should sanitize object keys', () => {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const data = { '<script>': 'value' };
      const result = sanitizeResponseData(data);
      expect(Object.keys(result as Record<string, unknown>)[0]).toContain('&lt;script&gt;');
    });

    it('should handle deeply nested structures', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              message: '<xss>',
            },
          },
        },
      };
      const result = sanitizeResponseData(data);
      expect(
        (result as Record<string, Record<string, Record<string, Record<string, unknown>>>>).level1
          .level2.level3.message
      ).toContain('&lt;xss&gt;');
    });

    // Best case: safe data
    it('BEST CASE: sanitize safe data', () => {
      const data = { name: 'John', email: 'john@example.com' };
      const result = sanitizeResponseData(data);
      expect((result as Record<string, unknown>).name).toBe('John');
    });

    // Worst case: all XSS payloads
    it('WORST CASE: sanitize multiple XSS payloads', () => {
      const data = {
        field1: '<script>alert(1)</script>',
        field2: '<img src=x onerror="alert(2)">',
        field3: '<iframe src="javascript:alert(3)"></iframe>',
      };
      const result = sanitizeResponseData(data);
      expect((result as Record<string, unknown>).field1).toContain('&lt;script&gt;');
      expect((result as Record<string, unknown>).field2).toContain('&lt;img');
      expect((result as Record<string, unknown>).field3).toContain('&lt;iframe');
    });
  });

  describe('secureResponseHeaders', () => {
    it('should set X-Content-Type-Options', () => {
      secureResponseHeaders(req as Request, res as Response, next);
      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    });

    it('should set X-Frame-Options', () => {
      secureResponseHeaders(req as Request, res as Response, next);
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });

    it('should set X-XSS-Protection', () => {
      secureResponseHeaders(req as Request, res as Response, next);
      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });

    it('should set Strict-Transport-Security', () => {
      secureResponseHeaders(req as Request, res as Response, next);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.stringContaining('max-age=31536000')
      );
    });

    it('should set Content-Security-Policy', () => {
      secureResponseHeaders(req as Request, res as Response, next);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("default-src 'self'")
      );
    });

    it('should set Referrer-Policy', () => {
      secureResponseHeaders(req as Request, res as Response, next);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
    });

    it('should set Permissions-Policy', () => {
      secureResponseHeaders(req as Request, res as Response, next);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.stringContaining('geolocation=()')
      );
    });

    it('should remove Server header', () => {
      secureResponseHeaders(req as Request, res as Response, next);
      expect(res.removeHeader).toHaveBeenCalledWith('Server');
    });

    it('should remove X-Powered-By header', () => {
      secureResponseHeaders(req as Request, res as Response, next);
      expect(res.removeHeader).toHaveBeenCalledWith('X-Powered-By');
    });

    it('should call next', () => {
      secureResponseHeaders(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('sanitizeJsonResponse', () => {
    it('should sanitize JSON response', () => {
      const originalJson = vi.fn().mockReturnThis();
      res.json = originalJson;

      sanitizeJsonResponse(req as Request, res as Response, next);

      const data = { message: '<script>alert("xss")</script>' };
      (res.json as unknown as (data: unknown) => void)(data);

      expect(originalJson).toHaveBeenCalled();
      const sanitizedData = originalJson.mock.calls[0][0] as Record<string, unknown>;
      expect(sanitizedData.message).toContain('&lt;script&gt;');
    });

    it('should preserve response structure', () => {
      const originalJson = vi.fn().mockReturnThis();
      res.json = originalJson;

      sanitizeJsonResponse(req as Request, res as Response, next);

      const data = { user: { name: 'John', email: 'john@example.com' } };
      (res.json as unknown as (data: unknown) => void)(data);

      const sanitizedData = originalJson.mock.calls[0][0] as Record<
        string,
        Record<string, unknown>
      >;
      expect(sanitizedData.user).toBeDefined();
      expect(sanitizedData.user.name).toBe('John');
    });

    it('should call next', () => {
      sanitizeJsonResponse(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('preventResponseSplitting', () => {
    it('should allow valid header values', () => {
      const originalSetHeader = vi.fn().mockReturnThis();
      res.setHeader = originalSetHeader;

      preventResponseSplitting(req as Request, res as Response, next);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (res.setHeader as any)('Content-Type', 'application/json');
      expect(originalSetHeader).toHaveBeenCalled();
    });

    it('should reject header with newline', () => {
      const originalSetHeader = vi.fn().mockReturnThis();
      res.setHeader = originalSetHeader;

      preventResponseSplitting(req as Request, res as Response, next);

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (res.setHeader as any)('X-Custom', 'value\nSet-Cookie: admin=true');
      }).toThrow();
    });

    it('should reject header with carriage return', () => {
      const originalSetHeader = vi.fn().mockReturnThis();
      res.setHeader = originalSetHeader;

      preventResponseSplitting(req as Request, res as Response, next);

      expect(() => {
        (res.setHeader as unknown as (name: string, value: string) => void)(
          'X-Custom',
          'value\rSet-Cookie: admin=true'
        );
      }).toThrow();
    });

    it('should reject header with CRLF', () => {
      const originalSetHeader = vi.fn().mockReturnThis();
      res.setHeader = originalSetHeader;

      preventResponseSplitting(req as Request, res as Response, next);

      expect(() => {
        (res.setHeader as unknown as (name: string, value: string) => void)(
          'X-Custom',
          'value\r\nSet-Cookie: admin=true'
        );
      }).toThrow();
    });

    it('should allow numeric header values', () => {
      const originalSetHeader = vi.fn().mockReturnThis();
      res.setHeader = originalSetHeader;

      preventResponseSplitting(req as Request, res as Response, next);

      (res.setHeader as unknown as (name: string, value: number) => void)('Content-Length', 1024);
      expect(originalSetHeader).toHaveBeenCalled();
    });

    it('should call next', () => {
      preventResponseSplitting(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    // Best case: valid headers
    it('BEST CASE: allow valid headers', () => {
      const originalSetHeader = vi.fn().mockReturnThis();
      res.setHeader = originalSetHeader;

      preventResponseSplitting(req as Request, res as Response, next);

      (res.setHeader as unknown as (name: string, value: string) => void)(
        'X-Custom-Header',
        'valid-value-123'
      );
      expect(originalSetHeader).toHaveBeenCalled();
    });

    // Worst case: CRLF injection
    it('WORST CASE: reject CRLF injection', () => {
      const originalSetHeader = vi.fn().mockReturnThis();
      res.setHeader = originalSetHeader;

      preventResponseSplitting(req as Request, res as Response, next);

      expect(() => {
        (res.setHeader as unknown as (name: string, value: string) => void)(
          'X-Custom',
          'value\r\nSet-Cookie: session=hijacked'
        );
      }).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      const result = encodeHtml('');
      expect(result).toBe('');
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      const result = encodeHtml(longString);
      expect(result.length).toBe(10000);
    });

    it('should handle unicode characters', () => {
      const result = encodeHtml('Hello 世界 🌍');
      expect(result).toContain('Hello');
    });

    it('should handle mixed content', () => {
      const data = {
        safe: 'Hello World',
        unsafe: '<script>alert(1)</script>',
        number: 42,
        boolean: true,
        null: null,
      };
      const result = sanitizeResponseData(data);
      expect((result as Record<string, unknown>).safe).toBe('Hello World');
      expect((result as Record<string, unknown>).unsafe).toContain('&lt;script&gt;');
      expect((result as Record<string, unknown>).number).toBe(42);
    });

    it('should handle circular references gracefully', () => {
      const data: Record<string, unknown> = { name: 'test' };
      data.self = data; // Circular reference
      // This should not throw
      expect(() => {
        sanitizeResponseData(data);
      }).not.toThrow();
    });
  });

  describe('Security Tests', () => {
    it('should prevent XSS via response', () => {
      const xssPayload = '<img src=x onerror="alert(\'xss\')">';
      const result = encodeHtml(xssPayload);
      // The entire payload should be encoded, including the onerror attribute
      expect(result).toContain('&lt;img');
      expect(result).toContain('&gt;');
      // onerror is encoded as part of the string, not as plain text
      expect(result).not.toContain('<img');
    });

    it('should prevent response splitting', () => {
      const originalSetHeader = vi.fn().mockReturnThis();
      res.setHeader = originalSetHeader;

      preventResponseSplitting(req as Request, res as Response, next);

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (res.setHeader as any)('X-Custom', 'value\r\nX-Injected: true');
      }).toThrow();
    });

    it('should prevent header injection', () => {
      const originalSetHeader = vi.fn().mockReturnThis();
      res.setHeader = originalSetHeader;

      preventResponseSplitting(req as Request, res as Response, next);

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (res.setHeader as any)('X-Custom', 'value\nSet-Cookie: admin=true');
      }).toThrow();
    });
  });
});
