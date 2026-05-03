import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  validateBody,
  validateQuery,
  validateParams,
  ValidationSchemas,
} from '../../middleware/validation.js';

describe('Validation Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn() as unknown as NextFunction;

    // Silence console.warn during validation tests to keep output clean
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('validateBody', () => {
    it('should pass valid body', () => {
      const schema = z.object({ name: z.string() });
      req.body = { name: 'John' };

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid body', () => {
      const schema = z.object({ name: z.string() });
      req.body = { name: 123 };

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });

    it('should reject missing required field', () => {
      const schema = z.object({ name: z.string() });
      req.body = {};

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should allow extra fields', () => {
      const schema = z.object({ name: z.string() });
      req.body = { name: 'John', extra: 'field' };

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should transform validated data', () => {
      const schema = z.object({ name: z.string().toUpperCase() });
      req.body = { name: 'john' };

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(req.body.name).toBe('JOHN');
      expect(next).toHaveBeenCalled();
    });

    // Best case: valid data
    it('BEST CASE: valid body passes validation', () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
        age: z.number().min(0).max(150),
      });
      req.body = { name: 'John', email: 'john@example.com', age: 30 };

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    // Worst case: completely invalid data
    it('WORST CASE: completely invalid body rejected', () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
        age: z.number(),
      });
      req.body = { name: 123, email: 'not-email', age: 'not-number' };

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateQuery', () => {
    it('should pass valid query', () => {
      const schema = z.object({ page: z.string() });
      req.query = { page: '1' };

      const middleware = validateQuery(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid query', () => {
      const schema = z.object({ page: z.string().regex(/^\d+$/) });
      req.query = { page: 'invalid' };

      const middleware = validateQuery(schema);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle optional query parameters', () => {
      const schema = z.object({ page: z.string().optional() });
      req.query = {};

      const middleware = validateQuery(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle multiple query parameters', () => {
      const schema = z.object({
        page: z.string(),
        limit: z.string(),
        sort: z.string(),
      });
      req.query = { page: '1', limit: '10', sort: 'name' };

      const middleware = validateQuery(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateParams', () => {
    it('should pass valid params', () => {
      const schema = z.object({ id: z.string() });
      req.params = { id: '123' };

      const middleware = validateParams(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid params', () => {
      const schema = z.object({ id: z.string().regex(/^\d+$/) });
      req.params = { id: 'invalid' };

      const middleware = validateParams(schema);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle UUID params', () => {
      const schema = z.object({
        id: z.string().uuid(),
      });
      req.params = { id: '550e8400-e29b-41d4-a716-446655440000' };

      const middleware = validateParams(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('ValidationSchemas', () => {
    describe('userId', () => {
      it('should accept valid user ID', () => {
        const result = ValidationSchemas.userId.safeParse('user123');
        expect(result.success).toBe(true);
      });

      it('should reject empty user ID', () => {
        const result = ValidationSchemas.userId.safeParse('');
        expect(result.success).toBe(false);
      });

      it('should reject user ID with special characters', () => {
        const result = ValidationSchemas.userId.safeParse('user@123');
        expect(result.success).toBe(false);
      });

      it('should reject user ID longer than 128 chars', () => {
        const result = ValidationSchemas.userId.safeParse('a'.repeat(129));
        expect(result.success).toBe(false);
      });

      // Best case
      it('BEST CASE: valid alphanumeric user ID', () => {
        const result = ValidationSchemas.userId.safeParse('user_123-abc');
        expect(result.success).toBe(true);
      });

      // Worst case
      it('WORST CASE: invalid user ID with all special chars', () => {
        const result = ValidationSchemas.userId.safeParse('!@#$%^&*()');
        expect(result.success).toBe(false);
      });
    });

    describe('email', () => {
      it('should accept valid email', () => {
        const result = ValidationSchemas.email.safeParse('user@example.com');
        expect(result.success).toBe(true);
      });

      it('should reject invalid email', () => {
        const result = ValidationSchemas.email.safeParse('not-an-email');
        expect(result.success).toBe(false);
      });

      it('should reject email longer than 254 chars', () => {
        const result = ValidationSchemas.email.safeParse('a'.repeat(250) + '@example.com');
        expect(result.success).toBe(false);
      });

      it('should accept email with plus addressing', () => {
        const result = ValidationSchemas.email.safeParse('user+tag@example.com');
        expect(result.success).toBe(true);
      });
    });

    describe('url', () => {
      it('should accept valid URL', () => {
        const result = ValidationSchemas.url.safeParse('https://example.com');
        expect(result.success).toBe(true);
      });

      it('should reject invalid URL', () => {
        const result = ValidationSchemas.url.safeParse('not a url');
        expect(result.success).toBe(false);
      });

      it('should accept URL with query params', () => {
        const result = ValidationSchemas.url.safeParse('https://example.com?key=value');
        expect(result.success).toBe(true);
      });
    });

    describe('claim', () => {
      it('should accept valid claim', () => {
        const result = ValidationSchemas.claim.safeParse('Is voting safe?');
        expect(result.success).toBe(true);
      });

      it('should reject empty claim', () => {
        const result = ValidationSchemas.claim.safeParse('');
        expect(result.success).toBe(false);
      });

      it('should reject claim longer than 5000 chars', () => {
        const result = ValidationSchemas.claim.safeParse('a'.repeat(5001));
        expect(result.success).toBe(false);
      });

      it('should accept claim with special characters', () => {
        const result = ValidationSchemas.claim.safeParse('Is voting "safe" & secure?');
        expect(result.success).toBe(true);
      });

      // Best case
      it('BEST CASE: valid claim', () => {
        const result = ValidationSchemas.claim.safeParse('Is voting safe in 2024?');
        expect(result.success).toBe(true);
      });

      // Worst case
      it('WORST CASE: extremely long claim', () => {
        const result = ValidationSchemas.claim.safeParse('a'.repeat(5001));
        expect(result.success).toBe(false);
      });
    });

    describe('message', () => {
      it('should accept valid message', () => {
        const result = ValidationSchemas.message.safeParse('Hello, how are you?');
        expect(result.success).toBe(true);
      });

      it('should reject empty message', () => {
        const result = ValidationSchemas.message.safeParse('');
        expect(result.success).toBe(false);
      });

      it('should reject message longer than 10000 chars', () => {
        const result = ValidationSchemas.message.safeParse('a'.repeat(10001));
        expect(result.success).toBe(false);
      });
    });

    describe('location', () => {
      it('should accept valid location', () => {
        const result = ValidationSchemas.location.safeParse('New York, USA');
        expect(result.success).toBe(true);
      });

      it('should reject empty location', () => {
        const result = ValidationSchemas.location.safeParse('');
        expect(result.success).toBe(false);
      });

      it('should reject location longer than 100 chars', () => {
        const result = ValidationSchemas.location.safeParse('a'.repeat(101));
        expect(result.success).toBe(false);
      });
    });

    describe('pagination', () => {
      it('should accept valid pagination', () => {
        const result = ValidationSchemas.pagination.safeParse({ limit: 10, offset: 0 });
        expect(result.success).toBe(true);
      });

      it('should accept partial pagination', () => {
        const result = ValidationSchemas.pagination.safeParse({ limit: 10 });
        expect(result.success).toBe(true);
      });

      it('should reject negative limit', () => {
        const result = ValidationSchemas.pagination.safeParse({ limit: -1 });
        expect(result.success).toBe(false);
      });

      it('should reject limit over 100', () => {
        const result = ValidationSchemas.pagination.safeParse({ limit: 101 });
        expect(result.success).toBe(false);
      });

      it('should reject negative offset', () => {
        const result = ValidationSchemas.pagination.safeParse({ offset: -1 });
        expect(result.success).toBe(false);
      });
    });

    describe('verifyClaimRequest', () => {
      it('should accept valid verify claim request', () => {
        const result = ValidationSchemas.verifyClaimRequest.safeParse({
          claim: 'Is voting safe?',
        });
        expect(result.success).toBe(true);
      });

      it('should reject missing claim', () => {
        const result = ValidationSchemas.verifyClaimRequest.safeParse({});
        expect(result.success).toBe(false);
      });
    });

    describe('chatRequest', () => {
      it('should accept valid chat request', () => {
        const result = ValidationSchemas.chatRequest.safeParse({
          userId: 'user123',
          message: 'Hello',
        });
        expect(result.success).toBe(true);
      });

      it('should accept chat request with optional fields', () => {
        const result = ValidationSchemas.chatRequest.safeParse({
          userId: 'user123',
          message: 'Hello',
          contextData: { key: 'value' },
          explanationMode: '1m',
        });
        expect(result.success).toBe(true);
      });

      it('should reject invalid explanation mode', () => {
        const result = ValidationSchemas.chatRequest.safeParse({
          userId: 'user123',
          message: 'Hello',
          explanationMode: 'invalid',
        });
        expect(result.success).toBe(false);
      });

      it('should reject missing userId', () => {
        const result = ValidationSchemas.chatRequest.safeParse({
          message: 'Hello',
        });
        expect(result.success).toBe(false);
      });

      it('should reject missing message', () => {
        const result = ValidationSchemas.chatRequest.safeParse({
          userId: 'user123',
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null body', () => {
      const schema = z.object({ name: z.string() });
      req.body = null;

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle undefined body', () => {
      const schema = z.object({ name: z.string() });
      req.body = undefined;

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle nested validation errors', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      });
      req.body = { user: { name: 'John', email: 'invalid' } };

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle array validation', () => {
      const schema = z.object({
        items: z.array(z.string()),
      });
      req.body = { items: ['a', 'b', 'c'] };

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle discriminated unions', () => {
      const schema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('admin'), role: z.literal('admin') }),
        z.object({ type: z.literal('user'), role: z.literal('user') }),
      ]);
      req.body = { type: 'admin', role: 'admin' };

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should return detailed error messages', () => {
      const schema = z.object({ name: z.string() });
      req.body = { name: 123 };

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callArgs = (res.json as any).mock.calls[0][0];
      expect(callArgs.details).toBeDefined();
      expect(Array.isArray(callArgs.details)).toBe(true);
    });

    it('should include field path in error', () => {
      const schema = z.object({
        user: z.object({ email: z.string().email() }),
      });
      req.body = { user: { email: 'invalid' } };

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callArgs = (res.json as any).mock.calls[0][0];
      expect(callArgs.details[0].path).toContain('email');
    });
  });
});
