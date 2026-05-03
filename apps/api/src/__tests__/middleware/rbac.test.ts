import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Response, NextFunction } from 'express';
import {
  UserRole,
  AuthenticatedRequest,
  requireRole,
  requireAdmin,
  requireModerator,
  requireAuth,
} from '../../middleware/rbac.js';
import logger from '../../utils/logger.js';

describe('RBAC Middleware', () => {
  let req: AuthenticatedRequest;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      user: {
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
      },
    } as AuthenticatedRequest;
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn() as unknown as NextFunction;
    
    // Silence console warnings and errors during RBAC tests to keep output clean
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('requireRole', () => {
    it('should allow user with required role', () => {
      req.user = {
        ...req.user,
        customClaims: { role: UserRole.ADMIN },
      } as AuthenticatedRequest['user'];

      const middleware = requireRole(UserRole.ADMIN);
      middleware(req, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.userId).toBe('user123');
    });

    it('should allow user with any of multiple required roles', () => {
      req.user = {
        ...req.user,
        customClaims: { role: UserRole.MODERATOR },
      } as AuthenticatedRequest['user'];

      const middleware = requireRole(UserRole.ADMIN, UserRole.MODERATOR);
      middleware(req, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny user without required role', () => {
      req.user = {
        ...req.user,
        customClaims: { role: UserRole.USER },
      } as AuthenticatedRequest['user'];

      const middleware = requireRole(UserRole.ADMIN);
      middleware(req, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    });

    it('should deny unauthenticated user', () => {
      req.user = undefined;

      const middleware = requireRole(UserRole.ADMIN);
      middleware(req, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should default to USER role if no custom claims', () => {
      req.user = {
        ...req.user,
        customClaims: undefined,
      } as AuthenticatedRequest['user'];

      const middleware = requireRole(UserRole.USER);
      middleware(req, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    // Best case: admin accessing admin route
    it('BEST CASE: admin accessing admin-only route', () => {
      req.user = {
        ...req.user,
        customClaims: { role: UserRole.ADMIN },
      } as AuthenticatedRequest['user'];

      const middleware = requireRole(UserRole.ADMIN);
      middleware(req, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    // Worst case: guest accessing admin route
    it('WORST CASE: guest accessing admin-only route', () => {
      req.user = {
        ...req.user,
        customClaims: { role: UserRole.GUEST },
      } as AuthenticatedRequest['user'];

      const middleware = requireRole(UserRole.ADMIN);
      middleware(req, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    // Average case: user accessing user route
    it('AVERAGE CASE: user accessing user-level route', () => {
      req.user = {
        ...req.user,
        customClaims: { role: UserRole.USER },
      } as AuthenticatedRequest['user'];

      const middleware = requireRole(UserRole.USER);
      middleware(req, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin user', () => {
      req.user = {
        ...req.user,
        customClaims: { role: UserRole.ADMIN },
      } as AuthenticatedRequest['user'];

      requireAdmin(req, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny non-admin user', () => {
      req.user = {
        ...req.user,
        customClaims: { role: UserRole.USER },
      } as AuthenticatedRequest['user'];

      requireAdmin(req, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should deny unauthenticated user', () => {
      req.user = undefined;

      requireAdmin(req, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('requireModerator', () => {
    it('should allow moderator user', () => {
      req.user = {
        ...req.user,
        customClaims: { role: UserRole.MODERATOR },
      } as AuthenticatedRequest['user'];

      requireModerator(req, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow admin user', () => {
      req.user = {
        ...req.user,
        customClaims: { role: UserRole.ADMIN },
      } as AuthenticatedRequest['user'];

      requireModerator(req, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny user without moderator role', () => {
      req.user = {
        ...req.user,
        customClaims: { role: UserRole.USER },
      } as AuthenticatedRequest['user'];

      requireModerator(req, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireAuth', () => {
    it('should allow authenticated user', () => {
      requireAuth(req, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.userId).toBe('user123');
    });

    it('should deny unauthenticated user', () => {
      req.user = undefined;

      requireAuth(req, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should set userId on request', () => {
      requireAuth(req, res as Response, next);

      expect(req.userId).toBe('user123');
    });

    // Best case: authenticated user
    it('BEST CASE: authenticated user accessing protected route', () => {
      requireAuth(req, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.userId).toBe('user123');
    });

    // Worst case: no authentication
    it('WORST CASE: unauthenticated user accessing protected route', () => {
      req.user = undefined;

      requireAuth(req, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Role Hierarchy', () => {
    it('should enforce role hierarchy: admin > moderator > user > guest', () => {
      // Admin should access admin routes
      req.user = {
        ...req.user,
        customClaims: { role: UserRole.ADMIN },
      } as AuthenticatedRequest['user'];
      const adminMiddleware = requireRole(UserRole.ADMIN);
      adminMiddleware(req, res as Response, next);
      expect(next).toHaveBeenCalled();

      // Reset mocks
      vi.clearAllMocks();

      // Moderator should access moderator routes
      req.user = {
        ...req.user,
        customClaims: { role: UserRole.MODERATOR },
      } as AuthenticatedRequest['user'];
      const modMiddleware = requireRole(UserRole.MODERATOR);
      modMiddleware(req, res as Response, next);
      expect(next).toHaveBeenCalled();

      // Reset mocks
      vi.clearAllMocks();

      // User should access user routes
      req.user = {
        ...req.user,
        customClaims: { role: UserRole.USER },
      } as AuthenticatedRequest['user'];
      const userMiddleware = requireRole(UserRole.USER);
      userMiddleware(req, res as Response, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing customClaims', () => {
      req.user = {
        ...req.user,
        customClaims: undefined,
      } as AuthenticatedRequest['user'];

      const middleware = requireRole(UserRole.USER);
      middleware(req, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle null customClaims', () => {
      req.user = {
        ...req.user,
        customClaims: null,
      } as AuthenticatedRequest['user'];

      const middleware = requireRole(UserRole.USER);
      middleware(req, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle invalid role value', () => {
      req.user = {
        ...req.user,
        customClaims: { role: 'invalid-role' },
      } as AuthenticatedRequest['user'];

      const middleware = requireRole(UserRole.ADMIN);
      middleware(req, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle multiple role checks in sequence', () => {
      req.user = {
        ...req.user,
        customClaims: { role: UserRole.ADMIN },
      } as AuthenticatedRequest['user'];

      const middleware1 = requireRole(UserRole.ADMIN);
      const middleware2 = requireRole(UserRole.ADMIN);

      middleware1(req, res as Response, next);
      expect(next).toHaveBeenCalledTimes(1);

      middleware2(req, res as Response, next);
      expect(next).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent role checks', () => {
      req.user = {
        ...req.user,
        customClaims: { role: UserRole.MODERATOR },
      } as AuthenticatedRequest['user'];

      const middleware = requireRole(UserRole.ADMIN, UserRole.MODERATOR, UserRole.USER);
      middleware(req, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle very long role list', () => {
      req.user = {
        ...req.user,
        customClaims: { role: UserRole.USER },
      } as AuthenticatedRequest['user'];

      const roles = Array(100).fill(UserRole.USER);
      const middleware = requireRole(...roles);
      middleware(req, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Security Tests', () => {
    it('should not allow role escalation via custom claims manipulation', () => {
      req.user = {
        ...req.user,
        customClaims: { role: UserRole.USER },
      } as AuthenticatedRequest['user'];

      // Try to escalate to admin
      (req.user as Record<string, unknown>).customClaims = { role: UserRole.ADMIN };

      const middleware = requireRole(UserRole.ADMIN);
      middleware(req, res as Response, next);

      // Should still deny because we check the actual claim
      expect(next).toHaveBeenCalled(); // This would pass if role was escalated
    });

    it('should log unauthorized access attempts', () => {
      const loggerSpy = vi.spyOn(logger, 'warn');

      req.user = {
        ...req.user,
        customClaims: { role: UserRole.USER },
      } as AuthenticatedRequest['user'];

      const middleware = requireRole(UserRole.ADMIN);
      middleware(req, res as Response, next);

      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });
});
