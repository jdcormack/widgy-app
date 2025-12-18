import { deleteRedisKeysByPattern } from "./redis-helpers";
import { TEST_ORGANIZATION_PREFIX } from "./constants";

/**
 * Generate a unique test email address
 * Uses +clerk_test pattern which triggers Clerk's test mode
 */
export function generateTestEmail(prefix = "test"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}+clerk_test@example.com`;
}

/**
 * Generate a unique organization slug
 */
export function generateOrgSlug(prefix = "test-org"): string {
  const timestamp = Date.now();
  return `${prefix}-${timestamp}`;
}

/**
 * Generate a unique organization name
 */
export function generateOrgName(prefix = "Test Org"): string {
  const timestamp = Date.now();
  return `${prefix} ${timestamp}`;
}

interface ClerkUser {
  id: string;
  email_addresses: Array<{ email_address: string }>;
}

interface ClerkOrganization {
  id: string;
  name: string;
  slug: string | null;
}

interface CleanupOptions {
  userEmails?: string[];
  userIds?: string[];
  deleteAllTestUsers?: boolean;
  testUserPrefix?: string;
}

const CLERK_API_URL = "https://api.clerk.com/v1";

/**
 * Get Clerk secret key from environment
 */
function getClerkSecretKey(): string {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) {
    throw new Error("CLERK_SECRET_KEY is required for cleanup operations");
  }
  return key;
}

/**
 * Get authorization headers for Clerk API
 */
function getAuthHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${getClerkSecretKey()}`,
    "Content-Type": "application/json",
  };
}

/**
 * Delete a single user by ID
 */
export async function deleteUserById(userId: string): Promise<boolean> {
  try {
    const response = await fetch(`${CLERK_API_URL}/users/${userId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      console.log(`✓ Deleted user with ID: ${userId}`);
      return true;
    } else {
      const error = await response.text();
      console.error(`✗ Failed to delete user ${userId}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`✗ Error deleting user ${userId}:`, error);
    return false;
  }
}

/**
 * Get user by email address
 */
export async function getUserByEmail(email: string): Promise<ClerkUser | null> {
  try {
    const response = await fetch(
      `${CLERK_API_URL}/users?email_address[]=${encodeURIComponent(email)}`,
      {
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch user ${email}`);
      return null;
    }

    const users: ClerkUser[] = await response.json();
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error(`Error fetching user ${email}:`, error);
    return null;
  }
}

/**
 * Delete a user by email address
 */
export async function deleteUserByEmail(email: string): Promise<boolean> {
  const user = await getUserByEmail(email);

  if (!user) {
    console.log(`User with email ${email} not found`);
    return false;
  }

  return await deleteUserById(user.id);
}

/**
 * Delete multiple users by email
 */
export async function deleteUsersByEmails(emails: string[]): Promise<void> {
  console.log(`\n🧹 Cleaning up ${emails.length} test user(s)...`);

  const results = await Promise.allSettled(
    emails.map((email) => deleteUserByEmail(email))
  );

  const successful = results.filter(
    (r) => r.status === "fulfilled" && r.value
  ).length;

  console.log(
    `✓ Cleanup complete: ${successful}/${emails.length} users deleted\n`
  );
}

/**
 * Delete multiple users by IDs
 */
export async function deleteUsersByIds(userIds: string[]): Promise<void> {
  console.log(`\n🧹 Cleaning up ${userIds.length} test user(s)...`);

  const results = await Promise.allSettled(
    userIds.map((id) => deleteUserById(id))
  );

  const successful = results.filter(
    (r) => r.status === "fulfilled" && r.value
  ).length;

  console.log(
    `✓ Cleanup complete: ${successful}/${userIds.length} users deleted\n`
  );
}

/**
 * Get all users matching a prefix or containing a string in their email
 */
export async function getUsersByPrefix(prefix: string): Promise<ClerkUser[]> {
  try {
    const response = await fetch(`${CLERK_API_URL}/users?limit=500`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      console.error("Failed to fetch users");
      return [];
    }

    const users: ClerkUser[] = await response.json();

    return users.filter((user) =>
      user.email_addresses.some((email) => email.email_address.includes(prefix))
    );
  } catch (error) {
    console.error("Error fetching users by prefix:", error);
    return [];
  }
}

/**
 * Delete all users matching a specific prefix
 */
export async function deleteUsersByPrefix(prefix: string): Promise<void> {
  console.log(`\n🧹 Finding test users with prefix "${prefix}"...`);

  const users = await getUsersByPrefix(prefix);

  if (users.length === 0) {
    console.log("No matching users found");
    return;
  }

  console.log(`Found ${users.length} user(s) to delete`);
  await deleteUsersByIds(users.map((u) => u.id));
}

/**
 * Main cleanup function with flexible options
 */
export async function cleanupTestUsers(options: CleanupOptions): Promise<void> {
  if (options.userEmails && options.userEmails.length > 0) {
    await deleteUsersByEmails(options.userEmails);
  }

  if (options.userIds && options.userIds.length > 0) {
    await deleteUsersByIds(options.userIds);
  }

  if (options.deleteAllTestUsers && options.testUserPrefix) {
    await deleteUsersByPrefix(options.testUserPrefix);
  }
}

/**
 * Get all organizations matching a prefix in their name or slug
 */
export async function getOrganizationsByPrefix(
  prefix: string
): Promise<ClerkOrganization[]> {
  try {
    const allOrganizations: ClerkOrganization[] = [];
    let offset = 0;
    const limit = 500;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(
        `${CLERK_API_URL}/organizations?limit=${limit}&offset=${offset}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Failed to fetch organizations: ${response.status} ${errorText}`
        );
        break;
      }

      const data = await response.json();

      // Handle both array response and paginated response with data property
      let organizations: ClerkOrganization[] = [];
      if (Array.isArray(data)) {
        organizations = data;
      } else if (data.data && Array.isArray(data.data)) {
        organizations = data.data;
      } else {
        console.error("Unexpected API response format:", data);
        break;
      }

      allOrganizations.push(...organizations);

      // Check if there are more pages
      if (organizations.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    const filtered = allOrganizations.filter(
      (org) =>
        org.name?.toLowerCase().includes(prefix.toLowerCase()) ||
        org.slug?.toLowerCase().includes(prefix.toLowerCase())
    );

    if (filtered.length > 0) {
      console.log(
        `Found ${filtered.length} organization(s) matching prefix "${prefix}":`,
        filtered.map((org) => `${org.name} (${org.slug || "no slug"})`)
      );
    }

    return filtered;
  } catch (error) {
    console.error("Error fetching organizations by prefix:", error);
    return [];
  }
}

/**
 * Delete a single organization by ID
 */
export async function deleteOrganizationById(orgId: string): Promise<boolean> {
  try {
    const response = await fetch(`${CLERK_API_URL}/organizations/${orgId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (response.ok || response.status === 204) {
      console.log(`✓ Deleted organization with ID: ${orgId}`);
      return true;
    } else {
      const errorText = await response.text();
      console.error(
        `✗ Failed to delete organization ${orgId}: ${response.status} ${response.statusText} - ${errorText}`
      );
      return false;
    }
  } catch (error) {
    console.error(`✗ Error deleting organization ${orgId}:`, error);
    return false;
  }
}

/**
 * Delete all organizations matching a specific prefix
 */
export async function deleteOrganizationsByPrefix(
  prefix: string
): Promise<void> {
  console.log(`\n🧹 Finding test organizations with prefix "${prefix}"...`);

  const organizations = await getOrganizationsByPrefix(prefix);

  // Delete redis cache entries containing org-test
  // Pattern matches: orgSlugIndex:org-test-*, subdomain:org-test-*, etc.
  await deleteRedisKeysByPattern(`*${TEST_ORGANIZATION_PREFIX}*`);

  if (organizations.length === 0) {
    console.log("No matching organizations found");
    return;
  }

  console.log(
    `Deleting ${organizations.length} organization(s):`,
    organizations.map((org) => `${org.name} (ID: ${org.id})`)
  );

  const results = await Promise.allSettled(
    organizations.map((org) => deleteOrganizationById(org.id))
  );

  const successful = results.filter(
    (r) => r.status === "fulfilled" && r.value
  ).length;

  const failed = organizations.length - successful;
  if (failed > 0) {
    console.warn(
      `⚠️  ${failed} organization(s) failed to delete. Check the errors above.`
    );
  }

  console.log(
    `✓ Cleanup complete: ${successful}/${organizations.length} organizations deleted\n`
  );
}
