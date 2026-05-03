import { describe, it, expect } from 'vitest';
import {
  sanitizeInput,
  sanitizeHtml,
  sanitizeLocation,
  isValidEmail,
  isValidUrl,
  truncateString,
} from '../../utils/sanitize.js';

describe('Sanitization Utils - Edge Cases', () => {
  describe('sanitizeInput - Edge Cases', () => {
    it('should handle extremely long strings', () => {
      const longString = 'a'.repeat(10000);
      const result = sanitizeInput(longString);
      expect(result).toBe(longString);
    });

    it('should handle strings with only special characters', () => {
      const specialChars = '!@#$%^&*(){}[]|\\:;"\'<>,.?/';
      const result = sanitizeInput(specialChars);
      expect(result).toContain('\\');
    });

    it('should handle mixed unicode and special characters', () => {
      const mixed = 'Hello "世界" with \\backslash';
      const result = sanitizeInput(mixed);
      expect(result).toContain('\\"');
    });

    it('should handle null bytes', () => {
      const withNull = 'test\0string';
      const result = sanitizeInput(withNull);
      expect(result).toContain('\\0');
    });

    it('should handle carriage returns', () => {
      const withCR = 'line1\rline2';
      const result = sanitizeInput(withCR);
      expect(result).toContain('\\r');
    });
  });

  describe('sanitizeHtml - Edge Cases', () => {
    it('should handle nested script tags', () => {
      const nested = '<div><script><script>alert("xss")</script></script></div>';
      const result = sanitizeHtml(nested);
      expect(result).not.toContain('<script>');
    });

    it('should handle event handlers with encoded characters', () => {
      const encoded = '<div onclick="alert(&#39;xss&#39;)">Click</div>';
      const result = sanitizeHtml(encoded);
      expect(result).not.toContain('onclick');
    });

    it('should handle multiple iframe tags', () => {
      const multiIframe = '<iframe src="evil.com"></iframe><iframe src="evil2.com"></iframe>';
      const result = sanitizeHtml(multiIframe);
      expect(result).not.toContain('<iframe');
    });

    it('should handle javascript protocol variations', () => {
      const variations = [
        '<a href="javascript:alert(1)">',
        '<a href="JAVASCRIPT:alert(1)">',
        '<a href="jAvAsCrIpT:alert(1)">',
      ];
      variations.forEach((html) => {
        const result = sanitizeHtml(html);
        expect(result.toLowerCase()).not.toContain('javascript:');
      });
    });

    it('should handle data URIs', () => {
      const dataUri = '<img src="data:text/html,<script>alert(1)</script>">';
      const result = sanitizeHtml(dataUri);
      expect(result).toBeDefined();
    });
  });

  describe('sanitizeLocation - Edge Cases', () => {
    it('should handle very long location strings', () => {
      const longLocation = 'A'.repeat(200);
      const result = sanitizeLocation(longLocation);
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should handle locations with only special characters', () => {
      const special = '!@#$%^&*()';
      const result = sanitizeLocation(special);
      expect(result).toBe('');
    });

    it('should handle mixed case and numbers', () => {
      const mixed = 'New York 123, USA-456';
      const result = sanitizeLocation(mixed);
      expect(result).toContain('New');
      expect(result).toContain('123');
    });

    it('should handle locations with multiple spaces', () => {
      const spaces = 'New    York    USA';
      const result = sanitizeLocation(spaces);
      expect(result).toContain('New');
    });

    it('should handle empty string', () => {
      expect(sanitizeLocation('')).toBe('');
    });
  });

  describe('isValidEmail - Edge Cases', () => {
    it('should reject emails with multiple @ symbols', () => {
      expect(isValidEmail('user@@example.com')).toBe(false);
    });

    it('should reject emails without domain extension', () => {
      expect(isValidEmail('user@example')).toBe(false);
    });

    it('should accept emails with subdomains', () => {
      expect(isValidEmail('user@mail.example.co.uk')).toBe(true);
    });

    it('should reject emails longer than 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(isValidEmail(longEmail)).toBe(false);
    });

    it('should reject emails with spaces', () => {
      expect(isValidEmail('user @example.com')).toBe(false);
    });

    it('should accept emails with plus addressing', () => {
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should accept emails with dots in local part', () => {
      expect(isValidEmail('first.last@example.com')).toBe(true);
    });
  });

  describe('isValidUrl - Edge Cases', () => {
    it('should accept URLs with ports', () => {
      expect(isValidUrl('http://localhost:3000')).toBe(true);
    });

    it('should accept URLs with query parameters', () => {
      expect(isValidUrl('https://example.com?key=value')).toBe(true);
    });

    it('should accept URLs with fragments', () => {
      expect(isValidUrl('https://example.com#section')).toBe(true);
    });

    it('should accept URLs with authentication', () => {
      expect(isValidUrl('https://user:pass@example.com')).toBe(true);
    });

    it('should reject URLs with invalid characters', () => {
      expect(isValidUrl('ht!tp://invalid')).toBe(false);
    });

    it('should accept file URLs', () => {
      expect(isValidUrl('file:///path/to/file')).toBe(true);
    });

    it('should reject relative URLs', () => {
      expect(isValidUrl('/path/to/page')).toBe(false);
    });

    it('should accept URLs with international domains', () => {
      expect(isValidUrl('https://münchen.de')).toBe(true);
    });
  });

  describe('truncateString - Edge Cases', () => {
    it('should handle zero length', () => {
      const result = truncateString('Hello World', 0);
      expect(result).toBe('');
    });

    it('should handle negative length', () => {
      const result = truncateString('Hello World', -1);
      expect(result).toBe('');
    });

    it('should handle very large max length', () => {
      const str = 'Hello';
      const result = truncateString(str, 1000000);
      expect(result).toBe(str);
    });

    it('should handle empty string', () => {
      expect(truncateString('', 10)).toBe('');
    });

    it('should handle null input', () => {
      expect(truncateString(null as unknown as string, 10)).toBe('');
    });

    it('should handle unicode characters', () => {
      const unicode = '你好世界';
      const result = truncateString(unicode, 2);
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should handle emoji', () => {
      const emoji = '😀😁😂😃😄';
      const result = truncateString(emoji, 2);
      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Best Case Scenarios', () => {
    it('sanitizeInput with clean input', () => {
      const clean = 'Hello World 123';
      expect(sanitizeInput(clean)).toBe(clean);
    });

    it('isValidEmail with standard email', () => {
      expect(isValidEmail('john.doe@example.com')).toBe(true);
    });

    it('isValidUrl with standard HTTPS URL', () => {
      expect(isValidUrl('https://www.example.com')).toBe(true);
    });

    it('sanitizeLocation with standard location', () => {
      const location = 'San Francisco, CA';
      expect(sanitizeLocation(location)).toBe('San Francisco, CA');
    });
  });

  describe('Worst Case Scenarios', () => {
    it('sanitizeInput with maximum complexity', () => {
      const worst = '"\'\\\n\r\t\0!@#$%^&*(){}[]|:;<>,.?/';
      const result = sanitizeInput(worst);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('sanitizeHtml with multiple attack vectors', () => {
      const worst =
        '<script>alert(1)</script><img src=x onerror="alert(2)"><iframe src="javascript:alert(3)"></iframe>';
      const result = sanitizeHtml(worst);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('<iframe');
    });

    it('isValidEmail with edge case', () => {
      expect(isValidEmail('a@b.c')).toBe(true);
    });

    it('truncateString with single character', () => {
      expect(truncateString('Hello', 1)).toBe('H');
    });
  });

  describe('Average Case Scenarios', () => {
    it('sanitizeInput with typical user input', () => {
      const typical = 'My name is "John" and I\'m from New York';
      const result = sanitizeInput(typical);
      expect(result).toContain('John');
    });

    it('sanitizeLocation with typical location', () => {
      const typical = 'Los Angeles, California';
      const result = sanitizeLocation(typical);
      expect(result).toContain('Los');
    });

    it('isValidEmail with typical email', () => {
      expect(isValidEmail('user@domain.com')).toBe(true);
    });

    it('isValidUrl with typical URL', () => {
      expect(isValidUrl('https://github.com/user/repo')).toBe(true);
    });
  });
});
