import test from 'node:test';
import assert from 'node:assert';
import type { UserProfileResponse } from '@squadup/shared';

// Create mock localStorage & sessionStorage
class MockStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const mockLocalStorage = new MockStorage();
const mockSessionStorage = new MockStorage();

(globalThis as any).window = {
  localStorage: mockLocalStorage,
  sessionStorage: mockSessionStorage,
};

// Import CacheService after setting globalThis.window
const { CacheService } = await import('../cache.service.js');

const sampleProfile: UserProfileResponse = {
  id: 'prof_123',
  userId: 'usr_cuid_123',
  clerkId: 'user_clerk_123',
  name: 'Alex Johnson',
  email: 'alex@example.edu',
  university: 'Stanford University',
  title: 'Full Stack Engineer',
  summary: 'Passionate about distributed systems.',
  skills: ['TypeScript', 'React', 'PostgreSQL'],
  education: [],
  experience: [],
  achievements: [],
  projects: [],
  githubUrl: 'https://github.com/alexj',
  linkedinUrl: 'https://linkedin.com/in/alexj',
  resumePdfUrl: null,
  lastResumeUploadedAt: null,
  taxonomyNodeIds: ['node_frontend', 'node_backend'],
  isVerifiedStudent: true,
  verificationReason: 'Verified Stanford .edu email',
  organizationDomain: 'stanford.edu',
  organizationName: 'Stanford University',
  teams: [],
  bannerConfig: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test('FrontendCacheService - setProfile stores canonical profile across L1/L2 and clears dependent caches', () => {
  mockLocalStorage.clear();
  mockSessionStorage.clear();
  CacheService.clearAll();

  // Populate mock dependent caches
  CacheService.set('sq:recs:user_clerk_123', { score: 95 }, 60000, 'local');
  CacheService.set('sq:teams:user:user_clerk_123', [{ id: 'team_1' }], 60000, 'local');

  let notifiedProfile: UserProfileResponse | null = null;
  const unsub = CacheService.onProfileUpdate((prof) => {
    notifiedProfile = prof;
  });

  try {
    CacheService.setProfile(sampleProfile);

    // 1. Check L1 / L2 population under all canonical keys
    const byClerk = CacheService.get<UserProfileResponse>('sq:profile:user_clerk_123', 'local');
    const byUserCuid = CacheService.get<UserProfileResponse>('sq:profile:usr_cuid_123', 'local');
    const byActive = CacheService.get<UserProfileResponse>('sq:profile:active_user', 'local');

    assert.ok(byClerk, 'Must find profile cached by clerkId');
    assert.strictEqual(byClerk.data.name, 'Alex Johnson');
    assert.strictEqual(byClerk.data.isVerifiedStudent, true);

    assert.ok(byUserCuid, 'Must find profile cached by DB userId');
    assert.strictEqual(byUserCuid.data.userId, 'usr_cuid_123');

    assert.ok(byActive, 'Must find profile cached under active_user');

    // 2. Dependent caches must be cleared
    assert.strictEqual(CacheService.get('sq:recs:user_clerk_123', 'local'), null, 'Recs cache must be cleared');
    assert.strictEqual(CacheService.get('sq:teams:user:user_clerk_123', 'local'), null, 'Teams cache must be cleared');

    // 3. Listener must receive the canonical profile
    assert.ok(notifiedProfile, 'Profile update listener must be triggered');
    assert.strictEqual((notifiedProfile as UserProfileResponse).clerkId, 'user_clerk_123');
  } finally {
    unsub();
  }
});

test('FrontendCacheService - invalidateProfile notifies listeners and clears matching keys without affecting other users', () => {
  mockLocalStorage.clear();
  CacheService.clearAll();

  // Cache User A
  CacheService.setProfile(sampleProfile);

  // Cache User B
  const userBProfile: UserProfileResponse = {
    ...sampleProfile,
    id: 'prof_456',
    userId: 'usr_cuid_456',
    clerkId: 'user_clerk_456',
    name: 'Beth Smith',
  };
  CacheService.setProfile(userBProfile);

  let invalidatedScope: string | undefined = 'initial';
  const unsub = CacheService.onProfileInvalidated((scope) => {
    invalidatedScope = scope;
  });

  try {
    // Invalidate User A specifically
    CacheService.invalidateProfile('user_clerk_123');

    assert.strictEqual(invalidatedScope, 'user_clerk_123');
    assert.strictEqual(CacheService.get('sq:profile:user_clerk_123', 'local'), null, 'User A profile must be removed');

    // User B must remain intact
    const userBCache = CacheService.get<UserProfileResponse>('sq:profile:user_clerk_456', 'local');
    assert.ok(userBCache, 'User B profile must NOT be removed when User A is invalidated');
    assert.strictEqual(userBCache.data.name, 'Beth Smith');
  } finally {
    unsub();
  }
});
