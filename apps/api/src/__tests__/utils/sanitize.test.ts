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
  });
});
