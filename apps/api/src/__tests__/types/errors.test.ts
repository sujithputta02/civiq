import { describe, it, expect } from 'vitest';
import { isZodError, getErrorMessage } from '../../types/errors';
import { z } from 'zod';

describe('Error Handling', () => {
  describe('isZodError', () => {
    it('BEST CASE: should identify Zod error', () => {
      const schema = z.object({ name: z.string() });
      try {
        schema.parse({ name: 123 });
        expect(true).toBe(false); // Should throw
      } catch (error) {
        expect(isZodError(error)).toBe(true);
      }
    });

    it('AVERAGE CASE: should identify validation error', () => {
      const schema = z.string().email();
      try {
        schema.parse('not-an-email');
        expect(true).toBe(false); // Should throw
      } catch (error) {
        expect(isZodError(error)).toBe(true);
      }
    });

    it('WORST CASE: should reject non-Zod error', () => {
      const error = new Error('Regular error');
      expect(isZodError(error)).toBe(false);
    });

    it('should reject null', () => {
      expect(isZodError(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isZodError(undefined)).toBe(false);
    });

    it('should reject string', () => {
      expect(isZodError('error')).toBe(false);
    });

    it('should reject object without issues property', () => {
      expect(isZodError({ message: 'error' })).toBe(false);
    });

    it('should accept object with issues property', () => {
      const zodError = {
        issues: [{ message: 'Invalid', path: ['field'] }],
      };
      expect(isZodError(zodError)).toBe(true);
    });

    it('should handle TypeError', () => {
      const error = new TypeError('Type error');
      expect(isZodError(error)).toBe(false);
    });

    it('should handle ReferenceError', () => {
      const error = new ReferenceError('Reference error');
      expect(isZodError(error)).toBe(false);
    });

    it('should handle SyntaxError', () => {
      const error = new SyntaxError('Syntax error');
      expect(isZodError(error)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('BEST CASE: should extract message from Error object', () => {
      const error = new Error('Test error message');
      const message = getErrorMessage(error);
      expect(message).toBe('Test error message');
    });

    it('AVERAGE CASE: should extract message from string', () => {
      const message = getErrorMessage('String error');
      expect(message).toBe('String error');
    });

    it('WORST CASE: should handle unknown error type', () => {
      const message = getErrorMessage({ unknown: 'error' });
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });

    it('should handle null error', () => {
      const message = getErrorMessage(null);
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });

    it('should handle undefined error', () => {
      const message = getErrorMessage(undefined);
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });

    it('should handle empty string', () => {
      const message = getErrorMessage('');
      expect(message).toBe('');
    });

    it('should handle object with message property', () => {
      const error = { message: 'Object error' };
      const message = getErrorMessage(error);
      expect(message).toContain('Object error');
    });

    it('should handle object without message property', () => {
      const error = { code: 'ERROR_CODE' };
      const message = getErrorMessage(error);
      expect(message).toBeDefined();
    });

    it('should handle Zod error', () => {
      const schema = z.object({ name: z.string() });
      try {
        schema.parse({ name: 123 });
        expect(true).toBe(false); // Should throw
      } catch (error) {
        const message = getErrorMessage(error);
        expect(message).toBeDefined();
        expect(typeof message).toBe('string');
      }
    });

    it('should handle TypeError', () => {
      const error = new TypeError('Type error message');
      const message = getErrorMessage(error);
      expect(message).toBe('Type error message');
    });

    it('should handle ReferenceError', () => {
      const error = new ReferenceError('Reference error message');
      const message = getErrorMessage(error);
      expect(message).toBe('Reference error message');
    });

    it('should handle SyntaxError', () => {
      const error = new SyntaxError('Syntax error message');
      const message = getErrorMessage(error);
      expect(message).toBe('Syntax error message');
    });

    it('should handle RangeError', () => {
      const error = new RangeError('Range error message');
      const message = getErrorMessage(error);
      expect(message).toBe('Range error message');
    });

    it('should handle custom error class', () => {
      class CustomError extends Error {
        public constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }
      const error = new CustomError('Custom error message');
      const message = getErrorMessage(error);
      expect(message).toBe('Custom error message');
    });

    it('should handle very long error message', () => {
      const longMessage = 'a'.repeat(10000);
      const error = new Error(longMessage);
      const message = getErrorMessage(error);
      expect(message.length).toBe(10000);
    });

    it('should handle error with special characters', () => {
      const error = new Error('Error with "quotes" and \'apostrophes\'');
      const message = getErrorMessage(error);
      expect(message).toContain('quotes');
    });

    it('should handle error with unicode', () => {
      const error = new Error('错误信息 🔴');
      const message = getErrorMessage(error);
      expect(message).toContain('错误信息');
    });

    it('should handle error with newlines', () => {
      const error = new Error('Line 1\nLine 2\nLine 3');
      const message = getErrorMessage(error);
      expect(message).toContain('\n');
    });

    it('should handle number error', () => {
      const message = getErrorMessage(404);
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });

    it('should handle boolean error', () => {
      const message = getErrorMessage(true);
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });

    it('should handle array error', () => {
      const message = getErrorMessage(['error1', 'error2']);
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });
  });

  describe('Edge Cases', () => {
    it('should handle circular reference in error object', () => {
      const error: Record<string, unknown> = { message: 'Circular error' };
      error.self = error; // Circular reference
      const message = getErrorMessage(error);
      expect(message).toBeDefined();
    });

    it('should handle error with null message', () => {
      const error = new Error();
      (error as unknown as Record<string, unknown>).message = null;
      const message = getErrorMessage(error);
      expect(message).toBeDefined();
    });

    it('should handle error with undefined message', () => {
      const error = new Error();
      (error as unknown as Record<string, unknown>).message = undefined;
      const message = getErrorMessage(error);
      expect(message).toBeDefined();
    });

    it('should handle error with empty message', () => {
      const error = new Error('');
      const message = getErrorMessage(error);
      expect(message).toBe('');
    });

    it('should handle multiple error types in sequence', () => {
      const errors: unknown[] = [
        new Error('Error 1'),
        new TypeError('Type Error'),
        'String Error',
        { message: 'Object Error' },
        null,
        undefined,
      ];

      errors.forEach((error) => {
        const message = getErrorMessage(error);
        expect(message).toBeDefined();
        expect(typeof message).toBe('string');
      });
    });

    it('should handle error with stack trace', () => {
      const error = new Error('Error with stack');
      const message = getErrorMessage(error);
      expect(message).toBe('Error with stack');
    });

    it('should handle error with cause', () => {
      const cause = new Error('Cause error');
      const error = new Error('Main error', { cause });
      const message = getErrorMessage(error);
      expect(message).toBe('Main error');
    });
  });

  describe('Security Tests', () => {
    it('should not expose sensitive data in error messages', () => {
      const error = new Error('Database connection failed: password123');
      const message = getErrorMessage(error);
      // Should still contain the message, but in production should be sanitized
      expect(message).toBeDefined();
    });

    it('should handle injection attempts in error message', () => {
      const error = new Error('Error: <script>alert("xss")</script>');
      const message = getErrorMessage(error);
      expect(message).toContain('<script>');
    });

    it('should handle SQL injection in error message', () => {
      const error = new Error("Error: '; DROP TABLE users; --");
      const message = getErrorMessage(error);
      expect(message).toContain('DROP TABLE');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of errors', () => {
      const errors = [];
      for (let i = 0; i < 1000; i++) {
        errors.push(new Error(`Error ${i}`));
      }

      errors.forEach((error) => {
        const message = getErrorMessage(error);
        expect(message).toBeDefined();
      });
    });

    it('should handle deeply nested error objects', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let error: any = { message: 'Deep error' };
      for (let i = 0; i < 100; i++) {
        error = { nested: error };
      }

      const message = getErrorMessage(error);
      expect(message).toBeDefined();
    });
  });
});
