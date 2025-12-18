import { clerkSetup } from "@clerk/testing/playwright";

/**
 * Global setup for Playwright tests
 * Initializes Clerk testing token at the start of the test suite
 */
async function globalSetup() {
  await clerkSetup();
}

export default globalSetup;
