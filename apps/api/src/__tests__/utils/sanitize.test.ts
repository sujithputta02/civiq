import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  sanitizeInput,
  sanitizeHtml,
  sanitizeLocation,
  isValidEmail,
  isValidUrl,
  truncateString,
} from '../../utils/sanitize.js';

describe('Sanitization Utils', () => {
  describe('sanitizeInput (Property-Based)', () => {
    it('should always return a string and handle random inputs', () => {
      fc.assert(
        fc.property(fc.string(), (text) => {
          const result = sanitizeInput(text);
          return typeof result === 'string';
        })
      );
    });

    it('should never contain raw newlines or tabs after sanitization', () => {
      fc.assert(
        fc.property(fc.string(), (text) => {
          const result = sanitizeInput(text);
          return !result.includes('\n') && !result.includes('\t');
        })
      );
    });
  });

  describe('sanitizeInput', () => {
    it('should escape special characters', () => {
      const input = 'Hello "world" with \\backslash';
      const result = sanitizeInput(input);
      expect(result).toContain('\\"');
      expect(result).toContain('\\\\');
    });

    it('should escape newlines and tabs', () => {
      const input = 'Line1\nLine2\tTabbed';
      const result = sanitizeInput(input);
      expect(result).toContain('\\n');
      expect(result).toContain('\\t');
    });

    it('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null as unknown as string)).toBe('');
    });

    it('should escape single quotes', () => {
      const input = "It's a test";
      const result = sanitizeInput(input);
      expect(result).toContain("\\'");
    });

    it('should escape carriage returns', () => {
      const input = 'Line1\rLine2';
      const result = sanitizeInput(input);
      expect(result).toContain('\\r');
    });

    it('should escape null bytes', () => {
      const input = 'Test\0Null';
      const result = sanitizeInput(input);
      expect(result).toContain('\\0');
    });

    it('should handle non-string input', () => {
      expect(sanitizeInput(undefined as unknown as string)).toBe('');
      expect(sanitizeInput(123 as unknown as string)).toBe('');
    });

    it('should handle all special characters together', () => {
      const input = 'Test\\"\'\\n\\r\\t\\0';
      const result = sanitizeInput(input);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const html = '<div>Hello<script>alert("xss")</script></div>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('<script>');
    });

    it('should remove event handlers', () => {
      const html = '<div onclick="alert(\'xss\')">Click me</div>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('onclick');
    });

    it('should remove javascript: protocol', () => {
      const html = '<a href="javascript:alert(\'xss\')">Link</a>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('javascript:');
    });

    it('should remove iframe tags', () => {
      const html = '<div>Content<iframe src="evil.com"></iframe></div>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('<iframe');
    });

    it('should handle empty strings', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as unknown as string)).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeHtml(undefined as unknown as string)).toBe('');
      expect(sanitizeHtml(123 as unknown as string)).toBe('');
    });

    it('should remove multiple event handlers', () => {
      const html = '<div onload="bad()" onmouseover="worse()">Test</div>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('onload');
      expect(result).not.toContain('onmouseover');
    });

    it('should handle case-insensitive script tags', () => {
      const html = '<SCRIPT>alert("xss")</SCRIPT>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('SCRIPT');
    });

    it('should handle nested script tags', () => {
      const html = '<div><script><script>alert("xss")</script></script></div>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('<script>');
    });
  });

  describe('sanitizeLocation', () => {
    it('should allow alphanumeric, spaces, hyphens, and commas', () => {
      const location = 'New York, USA';
      const result = sanitizeLocation(location);
      expect(result).toBe('New York, USA');
    });

    it('should remove special characters', () => {
      const location = 'City@#$%^&*()!';
      const result = sanitizeLocation(location);
      expect(result).not.toContain('@');
      expect(result).not.toContain('#');
      expect(result).not.toContain('!');
    });

    it('should limit length to 100 characters', () => {
      const location = 'A'.repeat(150);
      const result = sanitizeLocation(location);
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should handle empty strings', () => {
      expect(sanitizeLocation('')).toBe('');
      expect(sanitizeLocation(null as unknown as string)).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeLocation(undefined as unknown as string)).toBe('');
      expect(sanitizeLocation(123 as unknown as string)).toBe('');
    });

    it('should trim whitespace', () => {
      const location = '  New York  ';
      const result = sanitizeLocation(location);
      expect(result).toBe('New York');
    });

    it('should handle location with numbers', () => {
      const location = 'District 12, Zone 5';
      const result = sanitizeLocation(location);
      expect(result).toBe('District 12, Zone 5');
    });

    it('should handle location with hyphens', () => {
      const location = 'New-York-City';
      const result = sanitizeLocation(location);
      expect(result).toBe('New-York-City');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });

    it('should reject email longer than 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(isValidEmail(longEmail)).toBe(false);
    });

    it('should validate email with subdomain', () => {
      expect(isValidEmail('user@mail.example.com')).toBe(true);
    });

    it('should reject email with spaces', () => {
      expect(isValidEmail('user @example.com')).toBe(false);
    });

    it('should reject email without domain', () => {
      expect(isValidEmail('user@')).toBe(false);
    });

    it('should reject email without @', () => {
      expect(isValidEmail('userexample.com')).toBe(false);
    });

    it('should validate email with numbers', () => {
      expect(isValidEmail('user123@example.com')).toBe(true);
    });

    it('should validate email with hyphens', () => {
      expect(isValidEmail('user-name@example.com')).toBe(true);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('ht!tp://invalid')).toBe(false);
    });

    it('should validate URL with path', () => {
      expect(isValidUrl('https://example.com/path/to/page')).toBe(true);
    });

    it('should validate URL with query params', () => {
      expect(isValidUrl('https://example.com?param=value')).toBe(true);
    });

    it('should validate URL with hash', () => {
      expect(isValidUrl('https://example.com#section')).toBe(true);
    });

    it('should validate URL with port', () => {
      expect(isValidUrl('http://localhost:8080')).toBe(true);
    });

    it('should reject URL without protocol', () => {
      expect(isValidUrl('example.com')).toBe(false);
    });

    it('should validate ftp URL', () => {
      expect(isValidUrl('ftp://files.example.com')).toBe(true);
    });

    it('should validate file URL', () => {
      expect(isValidUrl('file:///path/to/file')).toBe(true);
    });
  });

  describe('truncateString', () => {
    it('should truncate strings to max length', () => {
      const result = truncateString('Hello World', 5);
      expect(result).toBe('Hello');
    });

    it('should not truncate if under max length', () => {
      const result = truncateString('Hi', 5);
      expect(result).toBe('Hi');
    });

    it('should handle zero or negative length', () => {
      expect(truncateString('abc', 0)).toBe('');
      expect(truncateString('abc', -1)).toBe('');
    });

    it('should handle empty strings', () => {
      expect(truncateString('', 10)).toBe('');
      expect(truncateString(null as unknown as string, 10)).toBe('');
    });

    it('should handle non-string input', () => {
      expect(truncateString(undefined as unknown as string, 10)).toBe('');
      expect(truncateString(123 as unknown as string, 10)).toBe('');
    });

    it('should handle exact length match', () => {
      const result = truncateString('Hello', 5);
      expect(result).toBe('Hello');
    });

    it('should handle unicode characters', () => {
      const result = truncateString('Hello 世界', 7);
      expect(result).toBe('Hello 世');
    });

    it('should handle emojis', () => {
      const result = truncateString('Hello 👋🌍', 7);
      expect(result.length).toBeLessThanOrEqual(7);
    });
  });
});
