import type { UserProfileResponse } from "@squadup/shared";

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

export type ProfileUpdateListener = (profile: UserProfileResponse) => void;
export type ProfileInvalidatedListener = (scope?: string) => void;

class FrontendCacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private profileUpdateListeners: Set<ProfileUpdateListener> = new Set();
  private profileInvalidatedListeners: Set<ProfileInvalidatedListener> = new Set();

  /**
   * Subscribe to complete profile updates (e.g. from direct mutation responses).
   * Returns an unsubscribe function.
   */
  public onProfileUpdate(listener: ProfileUpdateListener): () => void {
    this.profileUpdateListeners.add(listener);
    return () => {
      this.profileUpdateListeners.delete(listener);
    };
  }

  /**
   * Subscribe to profile cache invalidation events (e.g. from background tasks, membership updates).
   * Returns an unsubscribe function.
   */
  public onProfileInvalidated(listener: ProfileInvalidatedListener): () => void {
    this.profileInvalidatedListeners.add(listener);
    return () => {
      this.profileInvalidatedListeners.delete(listener);
    };
  }

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
   * Sets the canonical user profile into L1 (memory) and L2 (local storage)
   * under all relevant keys, clears dependent caches (teams, recs), and notifies listeners.
   */
  public setProfile(profile: UserProfileResponse): void {
    if (!profile) return;
    const ttlMs = 1000 * 60 * 30; // 30 minutes

    // Invalidate dependent caches that depend on user profile / skills
    this.invalidatePrefix("sq:recs:");
    this.invalidatePrefix("sq:teams:");

    // Save under canonical keys in L1 and L2
    if (profile.clerkId) {
      this.set(`sq:profile:${profile.clerkId}`, profile, ttlMs, "local");
    }
    if (profile.userId) {
      this.set(`sq:profile:${profile.userId}`, profile, ttlMs, "local");
    }
    this.set("sq:profile:active_user", profile, ttlMs, "local");

    // Also update public profile cache if present
    if (profile.userId) {
      this.set(`sq:public_profile:${profile.userId}`, profile, 1000 * 60 * 5, "session");
    }
    if (profile.clerkId) {
      this.set(`sq:public_profile:${profile.clerkId}`, profile, 1000 * 60 * 5, "session");
    }

    // Broadcast to UserContext and any other active listeners
    this.profileUpdateListeners.forEach((listener) => {
      try {
        listener(profile);
      } catch (err) {
        console.error("[CacheService] Error in profileUpdateListener:", err);
      }
    });
  }

  /**
   * Invalidates profile caches and notifies subscribers that the active profile is stale.
   */
  public invalidateProfile(userScope?: string): void {
    if (userScope) {
      this.invalidatePrefix(`sq:profile:${userScope}`);
      this.invalidatePrefix(`sq:public_profile:${userScope}`);
    } else {
      this.invalidatePrefix("sq:profile:");
      this.invalidatePrefix("sq:public_profile:");
    }
    this.invalidatePrefix("sq:recs:");
    this.invalidatePrefix("sq:teams:");

    this.profileInvalidatedListeners.forEach((listener) => {
      try {
        listener(userScope);
      } catch (err) {
        console.error("[CacheService] Error in profileInvalidatedListener:", err);
      }
    });
  }

  /**
   * Invalidate all caches for a specific user (on profile changes or logout).
   */
  public invalidateUser(userId: string): void {
    this.invalidateProfile(userId);
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
