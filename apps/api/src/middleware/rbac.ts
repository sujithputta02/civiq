import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

/**
 * Role-Based Access Control (RBAC) Middleware
 * Implements defense-in-depth authorization with role verification
 */

export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user',
  GUEST = 'guest',
}

export interface AuthenticatedRequest extends Request {
  user?: admin.auth.DecodedIdToken & { role?: UserRole };
  userId?: string;
}

/**
 * Verify user has required role
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const user = req.user;

      if (!user) {
        // eslint-disable-next-line no-console
        console.warn('RBAC: Access denied - no user');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const userRole = (user.customClaims?.role as UserRole) || UserRole.USER;

      if (!allowedRoles.includes(userRole)) {
        // eslint-disable-next-line no-console
        console.warn(`RBAC: Access denied for user ${user.uid} with role ${userRole}`);

        res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        return;
      }

      // Attach role to request for downstream use
      req.userId = user.uid;
      next();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('RBAC middleware error:', error);
      res.status(500).json({ error: 'Authorization error' });
    }
  };
}

/**
 * Verify user is admin
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireRole(UserRole.ADMIN)(req, res, next);
}

/**
 * Verify user is moderator or admin
 */
export function requireModerator(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  requireRole(UserRole.MODERATOR, UserRole.ADMIN)(req, res, next);
}

/**
 * Verify user is authenticated (any role)
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  req.userId = req.user.uid;
  next();
}

/**
 * Audit middleware to log all sensitive operations
 */
export function auditMiddleware(
  _req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  // Audit middleware is now handled in index.ts with proper async handling
  next();
}
