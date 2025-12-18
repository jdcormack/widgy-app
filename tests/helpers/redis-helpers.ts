import { redis } from "@/lib/redis";

/**
 * Delete Redis keys matching a pattern
 * @param pattern - Redis key pattern (supports wildcards like *org-test*)
 * @returns The number of keys deleted
 */
export async function deleteRedisKeysByPattern(
  pattern: string
): Promise<number> {
  try {
    // Find all keys matching the pattern
    const keys = await redis.keys(pattern);

    if (keys.length === 0) {
      console.log(`No Redis keys found matching pattern "${pattern}"`);
      return 0;
    }

    console.log(
      `Found ${keys.length} Redis key(s) matching pattern "${pattern}"`
    );

    // Delete all matching keys
    // Upstash Redis del() can accept multiple keys
    const deletedCount = await redis.del(...keys);

    console.log(`✓ Deleted ${deletedCount} Redis key(s)`);

    return deletedCount;
  } catch (error) {
    console.error(
      `✗ Error deleting Redis keys with pattern "${pattern}":`,
      error
    );
    throw error;
  }
}
