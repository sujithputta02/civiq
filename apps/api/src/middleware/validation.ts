import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Input Validation Middleware
 * Validates all inputs using Zod schemas with defense-in-depth
 */

/**
 * Validate request body against schema
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // eslint-disable-next-line no-console
        console.warn(`Validation error: ${JSON.stringify(error.errors)}`);
        res.status(400).json({
          error: 'Invalid request format',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      res.status(400).json({ error: 'Validation failed' });
    }
  };
}

/**
 * Validate request query parameters
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.query);
      // Type assertion is safe here as we've validated the data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // eslint-disable-next-line no-console
        console.warn(`Query validation error: ${JSON.stringify(error.errors)}`);
        res.status(400).json({
          error: 'Invalid query parameters',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      res.status(400).json({ error: 'Query validation failed' });
    }
  };
}

/**
 * Validate request parameters
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated as Record<string, string>;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // eslint-disable-next-line no-console
        console.warn(`Params validation error: ${JSON.stringify(error.errors)}`);
        res.status(400).json({
          error: 'Invalid URL parameters',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      res.status(400).json({ error: 'Params validation failed' });
    }
  };
}

/**
 * Common validation schemas
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ValidationSchemas = {
  // User ID validation
  userId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),

  // Email validation
  email: z.string().email().max(254),

  // URL validation
  url: z.string().url(),

  // Claim validation
  claim: z.string().min(1).max(5000),

  // Message validation
  message: z.string().min(1).max(10000),

  // Location validation
  location: z.string().min(1).max(100),

  // Pagination
  pagination: z.object({
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
  }),

  // Verify claim request
  verifyClaimRequest: z.object({
    claim: z.string().min(1).max(5000),
  }),

  // Chat request
  chatRequest: z.object({
    userId: z.string().min(1).max(128),
    message: z.string().min(1).max(10000),
    contextData: z.record(z.unknown()).optional(),
    explanationMode: z.enum(['15s', '1m', 'deep']).optional(),
  }),

  // Admin user creation
  adminUserCreation: z.object({
    email: z.string().email(),
    displayName: z.string().min(1).max(256),
    role: z.enum(['admin', 'moderator', 'user']),
  }),
};
