import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

declare global {
  namespace Express {
    interface Request {
      user?: admin.auth.DecodedIdToken;
    }
  }
}

export async function verifyFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      if (decodedToken.exp && decodedToken.exp * 1000 < Date.now()) {
        res.status(401).json({ error: 'Token expired' });
        return;
      }

      const tokenAge = Date.now() - (decodedToken.iat * 1000);
      const maxTokenAge = 24 * 60 * 60 * 1000;
      if (tokenAge > maxTokenAge) {
        res.status(401).json({ error: 'Token too old. Please log in again.' });
        return;
      }

      req.user = decodedToken;
      next();
    } catch (error: unknown) {
      console.error('Token verification failed:', error);
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error: unknown) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

export function verifyUserOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = req.user;
  const requestedUserId = (req.body.userId || req.query.userId) as string | undefined;

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (requestedUserId && requestedUserId !== user.uid) {
    console.warn(`Unauthorized access attempt: ${user.uid} tried to access ${requestedUserId}`);
    res.status(403).json({ error: 'Forbidden: Cannot access other users data' });
    return;
  }

  next();
}

export function verifyCustomClaim(claimName: string, claimValue: unknown) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const customClaims = user.customClaims || {};
    if (customClaims[claimName] !== claimValue) {
      console.warn(`Unauthorized claim access: ${user.uid} missing claim ${claimName}`);
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export function enforceHttps(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'production' && req.protocol !== 'https') {
    res.status(403).json({ error: 'HTTPS required' });
    return;
  }
  next();
}

export function setSecureHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
}
