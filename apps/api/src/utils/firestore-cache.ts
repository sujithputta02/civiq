import { Firestore } from '@google-cloud/firestore';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Simple in-memory cache for Firestore queries
 * Reduces database reads for frequently accessed data
 */
class FirestoreCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached value if not expired
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache value with optional TTL
   */
  public set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Invalidate cache entry
   */
  public invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  public size(): number {
    return this.cache.size;
  }
}

export const firestoreCache = new FirestoreCache();

/**
 * Batch read documents with caching
 */
export async function batchGetDocs<T>(
  db: Firestore,
  paths: string[]
): Promise<Map<string, T | null>> {
  const results = new Map<string, T | null>();
  const uncachedPaths: string[] = [];

  // Check cache first
  for (const path of paths) {
    const cached = firestoreCache.get<T>(path);
    if (cached !== null) {
      results.set(path, cached);
    } else {
      uncachedPaths.push(path);
    }
  }

  // Batch read uncached documents
  if (uncachedPaths.length > 0) {
    const refs = uncachedPaths.map((path) => db.doc(path));
    const docs = await db.getAll(...refs);

    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      const path = uncachedPaths[i];
      const data = doc.exists ? (doc.data() as T) : null;

      results.set(path, data);
      if (data) {
        firestoreCache.set(path, data);
      }
    }
  }

  return results;
}

/**
 * Paginated query with cursor support
 */
export async function paginatedQuery<T>(
  query: FirebaseFirestore.Query,
  pageSize: number = 20,
  cursor?: string
): Promise<{
  docs: T[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  let q = query.limit(pageSize + 1);

  if (cursor) {
    const cursorDoc = await query.startAfter(cursor).limit(1).get();
    if (cursorDoc.docs.length > 0) {
      q = query.startAfter(cursorDoc.docs[0]).limit(pageSize + 1);
    }
  }

  const snapshot = await q.get();
  const docs = snapshot.docs.slice(0, pageSize).map((doc) => doc.data() as T);
  const hasMore = snapshot.docs.length > pageSize;
  const nextCursor = hasMore ? snapshot.docs[pageSize - 1].id : null;

  return {
    docs,
    nextCursor,
    hasMore,
  };
}
