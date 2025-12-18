import { expect, test } from "@playwright/test";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { generateTestEmail } from "../helpers/clerk-helpers";
import {
  TEST_ORGANIZATION_PREFIX,
  TEST_VERIFICATION_CODE,
} from "../helpers/constants";

test("new user can sign up and create an organization", async ({ page }) => {
  await setupClerkTestingToken({ page });

  // Setup Clerk testing token to bypass bot detection
  await page.goto("/sign-up");

  await page.waitForSelector('[data-clerk-component="SignUp"]', {
    timeout: 10000,
  });

  const email = generateTestEmail("signup");

  if (!page.url().includes("/sign-up")) {
    await page.goto("/sign-up");
  }

  // Wait for Clerk sign-up form to load
  await page.waitForSelector('[data-clerk-component="SignUp"]', {
    timeout: 10000,
  });

  // Enter email address
  const emailInput = page.locator(
    'input[name="emailAddress"], input[name="identifier"]'
  );
  await emailInput.fill(email);

  // // Click continue button
  const continueButton = page.getByRole("button", { name: /continue/i });
  await continueButton.click();

  await page.waitForResponse((response) =>
    response.url().includes("prepare_verification")
  );

  // // Wait for verification code input to appear
  await page
    .getByRole("textbox", { name: "Enter verification code" })
    .waitFor({ timeout: 10000 });

  await page
    .getByRole("textbox", { name: "Enter verification code" })
    .fill(TEST_VERIFICATION_CODE);

  // // Wait for successful authentication redirect
  // // Clerk uses path-based routing, so intermediate steps may be under /sign-up/tasks/...
  // // After sign-up completes, user should be redirected to /create-organization
  await page.waitForURL(
    (url) => url.pathname === "/sign-up/tasks/choose-organization",
    { timeout: 20000 }
  );

  const orgio = TEST_ORGANIZATION_PREFIX + " " + Date.now().toString();
  const slug = orgio.replace(/ /g, "-");
  await page.getByRole("textbox", { name: "name" }).fill(orgio);
  await page.getByRole("textbox", { name: "slug" }).fill(slug);

  const orgContinueButton = page.getByRole("button", { name: /continue/i });
  await orgContinueButton.click();

  await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });

  await page.goto(`http://${slug}.localhost:3000/`);

  await expect(page.getByText(orgio)).toBeVisible();

  await clerk.signIn({
    page,
    signInParams: { strategy: "email_code", identifier: email },
  });

  await page.waitForSelector('[data-clerk-component="UserButton"]', {
    timeout: 10000,
  });

  // // Test admin area is protected
  await page.goto("/admin");
  await expect(page.getByText("Access Denied")).toBeVisible();
});

test("admin area is protected", async ({ page }) => {
  await setupClerkTestingToken({ page });

  await page.goto("/admin");

  await page.waitForURL((url) => url.pathname === "/sign-in", {
    timeout: 10000,
  });

  await expect(page.getByText("Sign in to widgy")).toBeVisible();
});
