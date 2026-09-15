import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Shared Redis client for caching
export const redisCache = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
});

redisCache.on('error', (err) => {
  console.warn('[Redis Cache] Warning/Error connecting to Redis:', err.message);
});

export class CacheService {
  /**
   * Retrieves a cached value and parses it as JSON.
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redisCache.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err) {
      console.warn(`[CacheService] Failed to read key "${key}":`, err);
      return null;
    }
  }

  /**
   * Caches a value serialized as JSON with an optional TTL in seconds.
   */
  static async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await redisCache.setex(key, ttlSeconds, serialized);
      } else {
        await redisCache.set(key, serialized);
      }
    } catch (err) {
      console.warn(`[CacheService] Failed to set key "${key}":`, err);
    }
  }

  /**
   * Deletes a specific key.
   */
  static async del(key: string): Promise<void> {
    try {
      await redisCache.del(key);
    } catch (err) {
      console.warn(`[CacheService] Failed to delete key "${key}":`, err);
    }
  }

  /**
   * Invalidates all keys matching a pattern (e.g., 'events:*', 'teams:*').
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redisCache.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys && keys.length > 0) {
          await redisCache.del(...keys);
        }
      } while (cursor !== '0');
    } catch (err) {
      console.warn(`[CacheService] Failed to invalidate pattern "${pattern}":`, err);
    }
  }

  /**
   * Computes a dynamic TTL for an event:
   * (seconds until event + 3 days). Minimum 300s, maximum 14 days (1,209,600s).
   */
  static calculateEventTTL(eventDate: Date | string): number {
    const targetTime = new Date(eventDate).getTime();
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const diffMs = (targetTime + threeDaysMs) - now;

    if (diffMs <= 0) {
      // Event concluded more than 3 days ago: cache for 5 minutes
      return 300;
    }

    const diffSeconds = Math.floor(diffMs / 1000);
    const maxTTL = 14 * 24 * 60 * 60; // 14 days in seconds
    return Math.min(Math.max(300, diffSeconds), maxTTL);
  }
}
