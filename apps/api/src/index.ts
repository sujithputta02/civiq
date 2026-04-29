import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { MythCheckSchema } from '@civiq/types';
import { adminDb } from './services/admin';
import {
  verifyFirebaseToken,
  verifyUserOwnership,
  enforceHttps,
  setSecureHeaders,
} from './middleware/auth';
import {
  validateSessionSecurity,
  detectSuspiciousActivityMiddleware,
  clearSession,
} from './middleware/security';
import { isZodError, getErrorMessage } from './types/errors';
import { requireAdmin } from './middleware/rbac';
import {
  secureResponseHeaders,
  sanitizeJsonResponse,
  preventResponseSplitting,
} from './middleware/output-encoding';
import { logAdminAction } from './services/audit';

// Lazy load heavy dependencies to reduce cold-start time
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let geminiModule: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pubsubModule: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let messagingModule: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let workerModule: any = null;

async function getGeminiModule() {
  if (!geminiModule) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geminiModule = await (import('./services/gemini.js') as any);
  }
  return geminiModule;
}

async function getPubsubModule() {
  if (!pubsubModule) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pubsubModule = await (import('./services/pubsub.js') as any);
  }
  return pubsubModule;
}

async function getMessagingModule() {
  if (!messagingModule) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messagingModule = await (import('./services/messaging.js') as any);
  }
  return messagingModule;
}

async function getWorkerModule() {
  if (!workerModule) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    workerModule = await (import('./worker.js') as any);
  }
  return workerModule;
}

const app = express();
const port = process.env.PORT || 3005;

// Security: Define allowed origins
const allowedOrigins = [
  'https://civiq.app',
  'https://www.civiq.app',
  process.env.FRONTEND_URL || 'http://localhost:3000',
];

// Security: Enforce HTTPS in production
app.use(enforceHttps);

// Security: Set secure headers
app.use(setSecureHeaders);

// Security: Prevent response splitting attacks
app.use(preventResponseSplitting);

// Security: Set additional secure response headers
app.use(secureResponseHeaders);

// Security: Sanitize JSON responses
app.use(sanitizeJsonResponse);

// Security: Configure CORS with restricted origins
app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // 24 hours
  })
);

// Security: Use Helmet for HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'https://generativelanguage.googleapis.com',
          'https://api.tavily.com',
        ],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

app.use(express.json({ limit: '10kb' })); // Limit payload size

// Security: Rate limiting for different endpoints
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many verification requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: express.Request) => req.path === '/health', // Don't rate limit health checks
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'Too many chat requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const remindersLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1, // 1 request per hour (for Cloud Scheduler)
  message: 'Too many reminder requests',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: express.Request) => req.path === '/health', // Don't rate limit health checks
});

// Handle common devtools noise
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => {
  res.status(204).end();
});

// Health check endpoint (no auth required)
app.get('/', (_req, res) => {
  res.json({ status: 'healthy', service: 'Civiq API', timestamp: new Date().toISOString() });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API v1 Routes
// ============

/**
 * POST /api/v1/verify
 * Verify a claim about elections
 * Requires: Firebase ID token
 * Rate limited: 10 requests per 15 minutes
 * Security: Session hijacking protection
 */
app.post(
  '/api/v1/verify',
  verifyLimiter,
  verifyFirebaseToken,
  validateSessionSecurity,
  detectSuspiciousActivityMiddleware,
  async (req, res): Promise<void> => {
    try {
      const validated = MythCheckSchema.parse(req.body);
      const gemini = await getGeminiModule();
      const result = await gemini.verifyClaim(validated.claim);

      // Asynchronously publish to Pub/Sub (fire and forget)
      const pubsub = await getPubsubModule();
      pubsub.publishMythVerification(validated.claim, result).catch((err: unknown) => {
        console.error('Failed to publish verification metric:', getErrorMessage(err));
      });

      res.json(result);
    } catch (error: unknown) {
      console.error('Verification error:', getErrorMessage(error));
      // Return generic error to client, log details server-side
      if (isZodError(error)) {
        res.status(400).json({ error: 'Invalid request format' });
      } else {
        res.status(500).json({ error: 'Verification failed. Please try again.' });
      }
    }
  }
);

/**
 * POST /api/v1/chat
 * Send a message to the AI assistant
 * Requires: Firebase ID token
 * Rate limited: 30 requests per minute
 * Security: Session hijacking protection
 */
app.post(
  '/api/v1/chat',
  chatLimiter,
  verifyFirebaseToken,
  validateSessionSecurity,
  verifyUserOwnership,
  detectSuspiciousActivityMiddleware,
  async (req, res): Promise<void> => {
    try {
      const { message, contextData, userId, explanationMode } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message is required' });
        return;
      }
      if (!userId || typeof userId !== 'string') {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      // Verify user owns this data
      if (!req.user || userId !== req.user.uid) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const gemini = await getGeminiModule();
      const reply = await gemini.chatAssistant(
        userId,
        message,
        contextData || {},
        explanationMode || '1m'
      );
      res.json({ reply });
    } catch (error: unknown) {
      console.error('Chat error:', getErrorMessage(error));
      res.status(500).json({ error: 'Chat failed. Please try again.' });
    }
  }
);

/**
 * GET /api/v1/chat
 * Retrieve chat history
 * Requires: Firebase ID token
 * Security: Session hijacking protection
 */
app.get(
  '/api/v1/chat',
  verifyFirebaseToken,
  validateSessionSecurity,
  verifyUserOwnership,
  detectSuspiciousActivityMiddleware,
  async (req, res): Promise<void> => {
    try {
      const { userId } = req.query;

      if (!userId || typeof userId !== 'string') {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      // Verify user owns this data
      if (!req.user || userId !== req.user.uid) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const doc = await adminDb
        .collection('users')
        .doc(userId)
        .collection('chat')
        .doc('session')
        .get();
      const history = doc.exists ? doc.data()?.messages || [] : [];
      res.json({ history });
    } catch (error: unknown) {
      console.error('Chat history error:', getErrorMessage(error));
      res.status(500).json({ error: 'Failed to retrieve chat history' });
    }
  }
);

/**
 * POST /api/v1/logout
 * Clear user session
 * Requires: Firebase ID token
 */
app.post('/api/v1/logout', verifyFirebaseToken, async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    clearSession(req.user.uid);
    res.json({ status: 'success', message: 'Logged out successfully' });
  } catch (error: unknown) {
    console.error('Logout error:', getErrorMessage(error));
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * POST /api/v1/cron/reminders
 * Send deadline reminders to users
 * Requires: Cloud Scheduler secret header
 * Rate limited: 1 request per hour
 */
app.post('/api/v1/cron/reminders', remindersLimiter, async (req, res): Promise<void> => {
  // Security: Verify Cloud Scheduler secret
  const schedulerSecret = req.headers['x-cloud-scheduler-secret'];
  if (schedulerSecret !== process.env.CLOUD_SCHEDULER_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const messaging = await getMessagingModule();
    const usersSnapshot = await adminDb.collection('users').get();
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    let notificationsSent = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data() as Record<string, unknown>;
      const timeline = (userData.timeline as unknown[]) || [];
      const fcmToken = userData.fcmToken as string | undefined;

      if (!fcmToken) continue;

      for (const item of timeline) {
        const timelineItem = item as Record<string, unknown>;
        // Check if item is not completed and has a deadline coming up
        if (timelineItem.status !== 'COMPLETED' && timelineItem.deadline) {
          const deadlineDate = new Date(timelineItem.deadline as string);
          // Very simple check: if deadline is within the next 24 hours
          if (deadlineDate > now && deadlineDate <= oneDayFromNow) {
            await messaging.sendPushNotification(
              fcmToken,
              `Deadline Reminder: ${timelineItem.title}`,
              `Don't forget: ${timelineItem.category} task is due soon!`
            );
            notificationsSent++;
            break; // Only send one reminder per user for now
          }
        }
      }
    }

    res.json({ status: 'success', sent: notificationsSent });
  } catch (error: unknown) {
    console.error('Reminders error:', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to send reminders' });
  }
});

/**
 * GET /api/v1/admin/stats
 * Get aggregated myth verification statistics
 * Requires: Firebase ID token with admin role
 */
app.get(
  '/api/v1/admin/stats',
  verifyFirebaseToken,
  requireAdmin,
  async (req, res): Promise<void> => {
    try {
      const userId = req.user?.uid || 'unknown';

      // Log admin access
      await logAdminAction(userId, 'VIEW_STATS', '/api/v1/admin/stats');

      const doc = await adminDb.collection('aggregates').doc('myth_stats').get();
      if (doc.exists) {
        res.json(doc.data());
      } else {
        res.json({
          totalQueries: 0,
          trueCount: 0,
          falseCount: 0,
          mixedCount: 0,
          recentQueries: [],
        });
      }
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('Stats error:', getErrorMessage(error));
      res.status(500).json({ error: 'Failed to retrieve statistics' });
    }
  }
);

/**
 * GET /api/v1/admin/audit-logs
 * Retrieve audit logs (admin only)
 */
app.get(
  '/api/v1/admin/audit-logs',
  verifyFirebaseToken,
  requireAdmin,
  async (req, res): Promise<void> => {
    try {
      const userId = req.user?.uid || 'unknown';
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);

      await logAdminAction(userId, 'VIEW_AUDIT_LOGS', '/api/v1/admin/audit-logs', { limit });

      const snapshot = await adminDb
        .collection('audit_logs')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      const logs = snapshot.docs.map((doc) => doc.data());
      res.json({ logs, count: logs.length });
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('Audit logs error:', getErrorMessage(error));
      res.status(500).json({ error: 'Failed to retrieve audit logs' });
    }
  }
);

/**
 * GET /api/v1/admin/security-events
 * Retrieve security events (admin only)
 */
app.get(
  '/api/v1/admin/security-events',
  verifyFirebaseToken,
  requireAdmin,
  async (req, res): Promise<void> => {
    try {
      const userId = req.user?.uid || 'unknown';
      const severity = req.query.severity as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);

      await logAdminAction(userId, 'VIEW_SECURITY_EVENTS', '/api/v1/admin/security-events', {
        severity,
        limit,
      });

      let query = adminDb.collection('security_events').orderBy('timestamp', 'desc');

      if (severity) {
        query = query.where('severity', '==', severity);
      }

      const snapshot = await query.limit(limit).get();
      const events = snapshot.docs.map((doc) => doc.data());

      res.json({ events, count: events.length });
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('Security events error:', getErrorMessage(error));
      res.status(500).json({ error: 'Failed to retrieve security events' });
    }
  }
);

// Catch-all for 404s
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found', path: _req.path });
});

app.listen(port, async () => {
  // eslint-disable-next-line no-console
  console.log(`Civiq API listening at http://localhost:${port}`);

  // Start the Pub/Sub background worker (lazy loaded)
  try {
    const worker = await getWorkerModule();
    const startWorker = worker.startMythVerificationWorker || worker.default?.startMythVerificationWorker;
    if (typeof startWorker === 'function') {
      await startWorker();
    } else {
      throw new Error('startMythVerificationWorker is not a function');
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to start Pub/Sub worker. Ensure ADC is configured:', err);
  }
});
