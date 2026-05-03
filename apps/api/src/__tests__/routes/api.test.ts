import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../index.js';

// Mock Firebase Admin
vi.mock('firebase-admin', () => {
  const mockAuth = {
    verifyIdToken: vi.fn(),
  };
  const mockDoc = {
    get: vi.fn(),
    set: vi.fn(),
    data: vi.fn(),
  };
  const mockCollection = {
    doc: vi.fn().mockReturnValue(mockDoc),
  };
  const mockDb = {
    collection: vi.fn().mockReturnValue(mockCollection),
  };

  return {
    auth: vi.fn(() => mockAuth),
    firestore: vi.fn(() => mockDb),
    initializeApp: vi.fn(),
    apps: [],
  };
});

describe('API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 and ok status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/v1/unknown');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/logout', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).post('/api/v1/logout');
      expect(res.status).toBe(401);
    });
  });
});
