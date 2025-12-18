import {
  deleteOrganizationsByPrefix,
  deleteUsersByPrefix,
} from "./helpers/clerk-helpers";
import { deleteBoardsByNamePrefix } from "./helpers/convex-helpers";
import {
  TEST_USER_PREFIX,
  TEST_ORGANIZATION_PREFIX,
} from "./helpers/constants";

/**
 * Global teardown for Playwright tests
 * Cleans up test data from Clerk, Convex, and Redis
 */
async function globalTeardown() {
  console.log("\n🧹 Starting global teardown: cleaning up test data...");

  // Clean up Convex boards first (before orgs are deleted)
  await deleteBoardsByNamePrefix(TEST_ORGANIZATION_PREFIX);

  // Clean up Clerk users and organizations (also cleans Redis)
  await deleteUsersByPrefix(TEST_USER_PREFIX);
  await deleteOrganizationsByPrefix(TEST_ORGANIZATION_PREFIX);

  console.log("✓ Global teardown completed successfully\n");
}

export default globalTeardown;
