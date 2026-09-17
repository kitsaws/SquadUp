/**
 * SquadUp Frontend Cache Service
 * Unified multi-tier caching (L1 In-Memory Map + L2 Web Storage)
 * Supports Stale-While-Revalidate (SWR), TTL expiration, and scoped cache invalidation.
 */

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

class FrontendCacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();

  private getStorage(type: "local" | "session"): Storage | null {
    if (typeof window === "undefined") return null;
    try {
      return type === "local" ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  }

  /**
   * Reads an item from cache. Returns null if not found or expired.
   */
  public get<T>(
    key: string,
    storageType: "local" | "session" | "memory" = "memory"
  ): { data: T; isStale: boolean } | null {
    const now = Date.now();

    // 1. Check L1 memory cache first
    const mem = this.memoryCache.get(key);
    if (mem) {
      const isExpired = now - mem.cachedAt > mem.ttlMs;
      if (!isExpired) {
        return { data: mem.data as T, isStale: false };
      }
      // If expired in memory, we treat it as stale SWR candidate
      return { data: mem.data as T, isStale: true };
    }

    // 2. Check L2 storage
    if (storageType !== "memory") {
      const storage = this.getStorage(storageType);
      if (storage) {
        try {
          const raw = storage.getItem(key);
          if (raw) {
            const parsed: CacheEntry<T> = JSON.parse(raw);
            const isExpired = now - parsed.cachedAt > parsed.ttlMs;
            // Warm up L1 memory cache
            this.memoryCache.set(key, parsed);
            return { data: parsed.data, isStale: isExpired };
          }
        } catch (e) {
          console.warn(`[CacheService] Failed to read key '${key}' from ${storageType}:`, e);
        }
      }
    }

    return null;
  }

  /**
   * Sets an item into cache with a defined TTL.
   */
  public set<T>(
    key: string,
    data: T,
    ttlMs: number,
    storageType: "local" | "session" | "memory" = "memory"
  ): void {
    const entry: CacheEntry<T> = {
      data,
      cachedAt: Date.now(),
      ttlMs,
    };

    // 1. Set in L1 memory
    this.memoryCache.set(key, entry);

    // 2. Set in L2 storage
    if (storageType !== "memory") {
      const storage = this.getStorage(storageType);
      if (storage) {
        try {
          storage.setItem(key, JSON.stringify(entry));
        } catch (e) {
          console.warn(`[CacheService] Failed to write key '${key}' to ${storageType}:`, e);
        }
      }
    }
  }

  /**
   * Stale-While-Revalidate fetch helper.
   * If fresh cache exists -> returns cache immediately.
   * If stale cache exists -> returns cache immediately and fires background fetcher.
   * If no cache -> awaits fetcher and caches result.
   */
  public async fetchWithSWR<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
      ttlMs?: number;
      storage?: "local" | "session";
      onBackgroundUpdate?: (freshData: T) => void;
      bypassCache?: boolean;
    }
  ): Promise<T> {
    const ttlMs = options?.ttlMs ?? 1000 * 60 * 5; // 5 minutes default
    const storageType = options?.storage ?? "local";

    if (!options?.bypassCache) {
      const cached = this.get<T>(key, storageType);
      if (cached) {
        if (!cached.isStale) {
          // Fresh cache hit
          return cached.data;
        }

        // Stale cache hit: trigger background revalidation without blocking caller
        fetcher()
          .then((fresh) => {
            this.set(key, fresh, ttlMs, storageType);
            if (options?.onBackgroundUpdate) {
              options.onBackgroundUpdate(fresh);
            }
          })
          .catch((err) => {
            console.warn(`[CacheService] SWR background revalidation failed for '${key}':`, err);
          });

        return cached.data;
      }
    }

    // Cache miss or bypassed: fetch immediately
    const fresh = await fetcher();
    this.set(key, fresh, ttlMs, storageType);
    return fresh;
  }

  /**
   * Invalidate a single key from memory and both storages.
   */
  public invalidate(key: string): void {
    this.memoryCache.delete(key);
    try {
      window?.localStorage?.removeItem(key);
      window?.sessionStorage?.removeItem(key);
    } catch {}
  }

  /**
   * Invalidate all keys matching a prefix.
   */
  public invalidatePrefix(prefix: string): void {
    // 1. Invalidate memory
    for (const k of this.memoryCache.keys()) {
      if (k.startsWith(prefix)) {
        this.memoryCache.delete(k);
      }
    }

    // 2. Invalidate web storages
    if (typeof window !== "undefined") {
      try {
        const removeMatching = (storage: Storage) => {
          const toRemove: string[] = [];
          for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key && key.startsWith(prefix)) {
              toRemove.push(key);
            }
          }
          toRemove.forEach((k) => storage.removeItem(k));
        };

        if (window.localStorage) removeMatching(window.localStorage);
        if (window.sessionStorage) removeMatching(window.sessionStorage);
      } catch {}
    }
  }

  /**
   * Invalidate all caches for a specific user (on profile changes or logout).
   */
  public invalidateUser(userId: string): void {
    this.invalidatePrefix(`sq:profile:${userId}`);
    this.invalidatePrefix(`sq:recs:${userId}`);
    this.invalidatePrefix(`sq:teams:user:${userId}`);
  }

  /**
   * Complete flush of all SquadUp caches.
   */
  public clearAll(): void {
    this.memoryCache.clear();
    this.invalidatePrefix("sq:");
  }
}

export const CacheService = new FrontendCacheService();
