import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { verifyClaim, chatAssistant } from './services/gemini';
import { MythCheckSchema } from '@civiq/types';
import { adminDb } from './services/admin';

const app = express();
const port = process.env.PORT || 3005;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Explicitly allow all connections and scripts for development
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src * ws: wss:;");
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// Handle common devtools noise
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.status(204).end();
});

import { publishMythVerification } from './services/pubsub';

app.get('/', (req, res) => {
  res.json({ status: 'healthy', service: 'Civiq API', timestamp: new Date().toISOString() });
});

// Routes
app.post('/api/verify', async (req, res) => {
  try {
    const validated = MythCheckSchema.parse(req.body);
    const result = await verifyClaim(validated.claim);
    
    // Asynchronously publish to Pub/Sub (fire and forget)
    publishMythVerification(validated.claim, result).catch(err => {
      console.error('Failed to publish verification metric:', err);
    });
    
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, contextData, userId, explanationMode } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });
    if (!userId) return res.status(400).json({ error: 'User ID is required' });
    
    const reply = await chatAssistant(userId, message, contextData || {}, explanationMode || '1m');
    res.json({ reply });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chat', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'User ID is required' });
    
    const doc = await adminDb.collection('users').doc(userId).collection('chat').doc('session').get();
    const history = doc.exists ? doc.data()?.messages || [] : [];
    res.json({ history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

import { sendPushNotification } from './services/messaging';

app.post('/api/cron/reminders', async (req, res) => {
  // In production, you would protect this with a secret header from Cloud Scheduler
  try {
    const usersSnapshot = await adminDb.collection('users').get();
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    let notificationsSent = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const timeline = userData.timeline || [];
      const fcmToken = userData.fcmToken;

      if (!fcmToken) continue;

      for (const item of timeline) {
        // Check if item is not completed and has a deadline coming up
        if (item.status !== 'COMPLETED' && item.deadline) {
          const deadlineDate = new Date(item.deadline);
          // Very simple check: if deadline is within the next 24 hours
          if (deadlineDate > now && deadlineDate <= oneDayFromNow) {
            await sendPushNotification(
              fcmToken,
              `Deadline Reminder: ${item.title}`,
              `Don't forget: ${item.category} task is due soon!`
            );
            notificationsSent++;
            break; // Only send one reminder per user for now
          }
        }
      }
    }

    res.json({ status: 'success', sent: notificationsSent });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    const doc = await adminDb.collection('aggregates').doc('myth_stats').get();
    if (doc.exists) {
      res.json(doc.data());
    } else {
      res.json({
        totalQueries: 0,
        trueCount: 0,
        falseCount: 0,
        mixedCount: 0,
        recentQueries: []
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all for 404s to ensure they also have the correct CSP and don't trigger browser errors
app.use((req, res) => {
  res.status(404)
    .setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src * ws: wss:;")
    .json({ error: 'Not Found', path: req.path });
});

import { startMythVerificationWorker } from './worker';

app.listen(port, () => {
  console.log(`Civiq API listening at http://localhost:${port}`);
  
  // Start the Pub/Sub background worker
  try {
    startMythVerificationWorker();
  } catch (err) {
    console.error('Failed to start Pub/Sub worker. Ensure ADC is configured:', err);
  }
});
