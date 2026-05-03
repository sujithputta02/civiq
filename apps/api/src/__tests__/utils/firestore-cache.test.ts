/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { firestoreCache, batchGetDocs, paginatedQuery } from '../../utils/firestore-cache.js';

describe('FirestoreCache Utilities', () => {
  beforeEach(() => {
    firestoreCache.clear();
  });

  describe('FirestoreCache Class', () => {
    it('should store and retrieve data', () => {
      firestoreCache.set('key1', { a: 1 });
      expect(firestoreCache.get('key1')).toEqual({ a: 1 });
      expect(firestoreCache.size()).toBe(1);
    });

    it('should return null for non-existent key', () => {
      expect(firestoreCache.get('missing')).toBe(null);
    });

    it('should expire entries based on TTL', async () => {
      vi.useFakeTimers();
      firestoreCache.set('key1', { a: 1 }, 100);
      expect(firestoreCache.get('key1')).toEqual({ a: 1 });

      vi.advanceTimersByTime(150);
      expect(firestoreCache.get('key1')).toBe(null);
      vi.useRealTimers();
    });

    it('should invalidate specific keys', () => {
      firestoreCache.set('key1', 1);
      firestoreCache.invalidate('key1');
      expect(firestoreCache.get('key1')).toBe(null);
    });
  });

  describe('batchGetDocs', () => {
    it('should use cache for existing entries', async () => {
      const db = {
        doc: vi.fn().mockReturnValue({ id: 'ref' }),
        getAll: vi.fn().mockResolvedValue([{ exists: true, data: () => ({ name: 'new' }) }]),
      } as any;
      firestoreCache.set('path/1', { name: 'cached' });

      const results = await batchGetDocs(db, ['path/1', 'path/2']);
      expect(results.get('path/1')).toEqual({ name: 'cached' });
      expect(results.get('path/2')).toEqual({ name: 'new' });
      expect(db.doc).toHaveBeenCalledTimes(1);
    });

    it('should fetch and cache uncached entries', async () => {
      const doc2 = { exists: true, data: () => ({ name: 'fetched' }) };
      const db = {
        doc: vi.fn().mockReturnValue('ref2'),
        getAll: vi.fn().mockResolvedValue([doc2]),
      } as any;

      const results = await batchGetDocs(db, ['path/2']);
      expect(results.get('path/2')).toEqual({ name: 'fetched' });
      expect(firestoreCache.get('path/2')).toEqual({ name: 'fetched' });
    });

    it('should handle missing documents in batch read', async () => {
      const doc2 = { exists: false };
      const db = {
        doc: vi.fn().mockReturnValue('ref2'),
        getAll: vi.fn().mockResolvedValue([doc2]),
      } as any;

      const results = await batchGetDocs(db, ['path/2']);
      expect(results.get('path/2')).toBe(null);
    });
  });

  describe('paginatedQuery', () => {
    it('should handle pagination without cursor', async () => {
      const mockDocs = Array(5)
        .fill(0)
        .map((_, i) => ({ id: `id${i}`, data: () => ({ i }) }));
      const query = {
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ docs: mockDocs }),
      } as any;

      const result = await paginatedQuery(query, 3);
      expect(result.docs.length).toBe(3);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('id2');
    });

    it('should handle pagination with cursor', async () => {
      const cursorDoc = { docs: [{ id: 'cursor' }] };
      const mockDocs = [{ id: 'id1', data: () => ({ i: 1 }) }];
      const query = {
        limit: vi.fn().mockReturnThis(),
        startAfter: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValueOnce(cursorDoc).mockResolvedValueOnce({ docs: mockDocs }),
      } as any;

      const result = await paginatedQuery(query, 10, 'some-cursor');
      expect(query.startAfter).toHaveBeenCalledWith('some-cursor');
      expect(result.docs.length).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should handle empty cursor results', async () => {
      const query = {
        limit: vi.fn().mockReturnThis(),
        startAfter: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValueOnce({ docs: [] }).mockResolvedValueOnce({ docs: [] }),
      } as any;

      const result = await paginatedQuery(query, 10, 'invalid-cursor');
      expect(result.docs.length).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });
});
