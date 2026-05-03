import { Request, Response, NextFunction } from 'express';
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as admin from 'firebase-admin';
import { recordAuthFailure } from './threat-detection.js';
import logger from '../utils/logger.js';
import { env } from '@civiq/config-env';

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

      req.user = decodedToken;
      next();
    } catch (error: unknown) {
      logger.warn({ error, ip: req.ip }, 'Token verification failed');
      recordAuthFailure(req.ip || req.socket?.remoteAddress || 'unknown');
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error: unknown) {
    logger.error(error, 'Auth middleware error');
    res.status(500).json({ error: 'Authentication error' });
  }
}

export function verifyUserOwnership(req: Request, res: Response, next: NextFunction): void {
  const user = req.user;
  const requestedUserId = (req.body.userId || req.query.userId) as string | undefined;

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (requestedUserId && requestedUserId !== user.uid) {
    logger.warn({ currentUid: user.uid, targetUid: requestedUserId }, 'Unauthorized access attempt');
    res.status(403).json({ error: 'Forbidden: Cannot access other users data' });
    return;
  }

  next();
}

export function enforceHttps(req: Request, res: Response, next: NextFunction): void {
  if (env.NODE_ENV === 'production' && req.protocol !== 'https') {
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
