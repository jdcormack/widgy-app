import { execSync } from "child_process";

/**
 * Delete all boards with names containing the given prefix.
 * Uses the Convex CLI to run the internal mutation.
 * Used for cleaning up test data after e2e tests.
 */
export async function deleteBoardsByNamePrefix(prefix: string): Promise<void> {
  console.log(`\n🧹 Cleaning up Convex boards with name prefix "${prefix}"...`);

  try {
    // Use the Convex CLI to run the internal mutation
    const result = execSync(
      `npx convex run boards:deleteByNamePrefix '{"prefix": "${prefix}"}'`,
      {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    const deletedCount = parseInt(result.trim(), 10) || 0;
    console.log(`✓ Deleted ${deletedCount} board(s) from Convex\n`);
  } catch (error) {
    // Log the error but don't fail the cleanup process
    console.error(`⚠️ Could not clean up Convex boards: ${error}`);
    console.log(
      "Note: Make sure Convex dev server is running for cleanup to work."
    );
  }
}
