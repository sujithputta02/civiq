import { env } from '@civiq/config-env';
/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from './utils/logger.js';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { MythCheckSchema } from '@civiq/types';
import { adminDb } from './modules/identity/admin.service.js';
import {
  verifyFirebaseToken,
  verifyUserOwnership,
  enforceHttps,
  setSecureHeaders,
} from './middleware/auth.js';
import {
  validateSessionSecurity,
  detectSuspiciousActivityMiddleware,
  clearSession,
} from './middleware/security.js';
import { isZodError } from './types/errors.js';
import { requireAdmin } from './middleware/rbac.js';
import {
  secureResponseHeaders,
  sanitizeJsonResponse,
  preventResponseSplitting,
} from './middleware/output-encoding.js';
import { logAdminAction } from './modules/security/audit.service.js';
import { threatDetectionMiddleware } from './middleware/threat-detection.js';
import { assertSafeForAI } from './utils/ai-firewall.js';
import { startMythVerificationWorker } from './worker.js';

const app = express();
const port = env.PORT;

// Security: Enforce HTTPS in production
app.use(enforceHttps);
app.use(setSecureHeaders);
app.use(preventResponseSplitting);
app.use(secureResponseHeaders);
app.use(sanitizeJsonResponse);

app.use(
  cors({
    origin: [env.FRONTEND_URL, 'https://civiq.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(threatDetectionMiddleware);

// Rate Limiters
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many verification requests' },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.post(
  '/api/v1/verify',
  verifyLimiter,
  verifyFirebaseToken,
  validateSessionSecurity,
  detectSuspiciousActivityMiddleware,
  async (req, res): Promise<void> => {
    try {
      const validated = MythCheckSchema.parse(req.body);
      const userId = (req as { user?: { uid: string } }).user?.uid || 'anonymous';
      const safeClaim = assertSafeForAI(validated.claim, userId);

      const { aiService } = await import('./modules/ai/ai.service.js');
      const result = await aiService.verifyClaim(safeClaim);

      const { publishMythVerification } = await import('./modules/communication/pubsub.service.js');
      publishMythVerification(validated.claim, result).catch((err: unknown) => logger.error(err));

      res.json(result);
    } catch (error: unknown) {
      logger.error(error, 'Verification error');
      res.status(isZodError(error) ? 400 : 500).json({ error: 'Verification failed' });
    }
  }
);

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
      const safeMessage = assertSafeForAI(message, userId);

      const { aiService } = await import('./modules/ai/ai.service.js');
      const reply = await aiService.chatAssistant(
        userId,
        safeMessage,
        contextData || {},
        explanationMode
      );
      res.json({ reply });
    } catch (error: unknown) {
      logger.error(error, 'Chat error');
      res.status(500).json({ error: 'Chat failed' });
    }
  }
);

app.post('/api/v1/logout', verifyFirebaseToken, async (req, res) => {
  if (req.user) {
    await clearSession(req.user.uid);
  }
  res.json({ status: 'success' });
});

// Admin Routes
app.get('/api/v1/admin/stats', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.user?.uid || 'unknown';
    await logAdminAction(userId, 'VIEW_STATS', '/api/v1/admin/stats');
    const doc = await adminDb.collection('aggregates').doc('myth_stats').get();
    res.json(doc.exists ? doc.data() : { totalQueries: 0 });
  } catch (error) {
    logger.error(error, 'Stats retrieval error');
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

// Catch-all
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

if (env.NODE_ENV !== 'test') {
  app.listen(port, async () => {
    // Industrial-grade console output for developers
    if (env.NODE_ENV === 'development') {
      /* eslint-disable no-console */
      console.log('\n🚀 Civiq API is running in industrial mode!');
      console.log(`📡 Local Access: http://localhost:${port}`);
      console.log(`🏥 Health Check: http://localhost:${port}/health\n`);
      /* eslint-enable no-console */
    }

    logger.info({ port }, 'Civiq API started');

    try {
      await startMythVerificationWorker();
    } catch (err) {
      logger.error(err, 'Failed to start Pub/Sub worker');
    }
  });
}

export default app;
