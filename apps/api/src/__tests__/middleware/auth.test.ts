import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { verifyUserOwnership } from '../../middleware/auth';

interface MockRequest extends Partial<Request> {
  user?: admin.auth.DecodedIdToken;
}

describe('Auth Middleware', () => {
  let req: MockRequest;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      body: { userId: 'user123' },
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn() as unknown as NextFunction;
  });

  describe('verifyUserOwnership', () => {
    it('should allow access when user owns the data', () => {
      req.user = {
        aud: 'test-aud',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        auth_time: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        firebase: { identities: {}, sign_in_provider: 'custom' },
        iat: Math.floor(Date.now() / 1000),
        iss: 'https://securetoken.google.com/test',
        sub: 'user123',
        uid: 'user123',
      };

      verifyUserOwnership(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access when user does not own the data', () => {
      req.user = {
        aud: 'test-aud',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        auth_time: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        firebase: { identities: {}, sign_in_provider: 'custom' },
        iat: Math.floor(Date.now() / 1000),
        iss: 'https://securetoken.google.com/test',
        sub: 'user123',
        uid: 'user123',
      };
      req.body = { userId: 'user456' };

      verifyUserOwnership(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    });

    it('should deny access when user is not authenticated', () => {
      req.user = undefined;

      verifyUserOwnership(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
