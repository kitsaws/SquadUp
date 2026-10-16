import test, { after } from 'node:test';
import assert from 'node:assert';
import { CacheService, redisCache } from '../cache.service.js';

after(() => {
  redisCache.disconnect();
});

test('CacheService - invalidateProfile scope isolation', async () => {
  const deletedKeys: string[] = [];
  const scannedPatterns: string[] = [];

  // Stub del and invalidatePattern on CacheService
  const originalDel = CacheService.del;
  const originalInvalidatePattern = CacheService.invalidatePattern;

  try {
    CacheService.del = async (key: string) => {
      deletedKeys.push(key);
    };

    CacheService.invalidatePattern = async (pattern: string) => {
      scannedPatterns.push(pattern);
    };

    // Test 1: Invalidate single user (User A)
    await CacheService.invalidateProfile('userA_db_id');

    // User A keys should be deleted
    assert.ok(deletedKeys.includes('profile:userA_db_id'), 'Should delete exact profile key for User A');
    assert.ok(deletedKeys.includes('public_profile:userA_db_id'), 'Should delete exact public_profile key for User A');
    assert.ok(scannedPatterns.includes('profile:userA_db_id*'), 'Should scan profile:userA_db_id*');
    assert.ok(scannedPatterns.includes('recs:userA_db_id*'), 'Should scan recs:userA_db_id*');

    // Crucial isolation check: User B keys must NOT be deleted
    assert.strictEqual(deletedKeys.includes('profile:userB_db_id'), false, 'Must NOT delete User B key');
    assert.strictEqual(scannedPatterns.includes('profile:userB_db_id*'), false, 'Must NOT scan User B pattern');

    // Regression check: Global pattern 'profile:*' must NOT be scanned when a userId is provided!
    assert.strictEqual(
      scannedPatterns.includes('profile:*'),
      false,
      'Must NOT invalidate global pattern profile:* when userId is supplied'
    );

    // Test 2: Invalidate with both DB ID and Clerk ID
    deletedKeys.length = 0;
    scannedPatterns.length = 0;

    await CacheService.invalidateProfile('userA_db_id', 'userA_clerk_id');
    assert.ok(deletedKeys.includes('profile:userA_db_id'));
    assert.ok(deletedKeys.includes('profile:userA_clerk_id'));
    assert.ok(scannedPatterns.includes('profile:userA_db_id*'));
    assert.ok(scannedPatterns.includes('profile:userA_clerk_id*'));
    assert.strictEqual(scannedPatterns.includes('profile:*'), false);

    // Test 3: Global invalidation when NO user ID is provided
    deletedKeys.length = 0;
    scannedPatterns.length = 0;

    await CacheService.invalidateProfile();
    assert.ok(scannedPatterns.includes('profile:*'), 'Global invalidation must scan profile:*');
    assert.ok(scannedPatterns.includes('public_profile:*'), 'Global invalidation must scan public_profile:*');
    assert.ok(scannedPatterns.includes('recs:*'), 'Global invalidation must scan recs:*');

    // Test 4: Safe handling of nonexistent / empty user ID
    deletedKeys.length = 0;
    scannedPatterns.length = 0;
    await CacheService.invalidateProfile('non_existent_user_9999');
    assert.ok(deletedKeys.includes('profile:non_existent_user_9999'));

  } finally {
    CacheService.del = originalDel;
    CacheService.invalidatePattern = originalInvalidatePattern;
  }
});

test('CacheService - error handling resilience', async () => {
  const originalDel = CacheService.del;
  try {
    // Force del to throw an unhandled error
    CacheService.del = async () => {
      throw new Error('Simulated Redis network disconnection');
    };

    // invalidateProfile must catch errors gracefully and not throw
    await assert.doesNotReject(
      async () => {
        await CacheService.invalidateProfile('user_error_test');
      },
      'invalidateProfile must not throw even if Redis operations fail'
    );
  } finally {
    CacheService.del = originalDel;
  }
});
