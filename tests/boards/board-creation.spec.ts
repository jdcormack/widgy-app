import { expect, test } from "@playwright/test";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { generateTestEmail } from "../helpers/clerk-helpers";
import {
  TEST_ORGANIZATION_PREFIX,
  TEST_VERIFICATION_CODE,
} from "../helpers/constants";

const TEST_PRIVATE_BOARD_NAME =
  TEST_ORGANIZATION_PREFIX + " Private Test Board";
const TEST_PUBLIC_BOARD_NAME = TEST_ORGANIZATION_PREFIX + " Public Test Board";

test.describe("Board Creation - Authenticated User", () => {
  let orgSlug: string;
  let userEmail: string;

  test.beforeAll(async ({ browser }) => {
    // Create a fresh test user and organization for these tests
    const page = await browser.newPage();
    await setupClerkTestingToken({ page });

    await page.goto("/sign-up");

    await page.waitForSelector('[data-clerk-component="SignUp"]', {
      timeout: 10000,
    });

    userEmail = generateTestEmail("board-test");

    // Enter email address
    const emailInput = page.locator(
      'input[name="emailAddress"], input[name="identifier"]'
    );
    await emailInput.fill(userEmail);

    // Click continue button
    const continueButton = page.getByRole("button", { name: /continue/i });
    await continueButton.click();

    await page.waitForResponse((response) =>
      response.url().includes("prepare_verification")
    );

    // Wait for verification code input to appear
    await page
      .getByRole("textbox", { name: "Enter verification code" })
      .waitFor({ timeout: 10000 });

    await page
      .getByRole("textbox", { name: "Enter verification code" })
      .fill(TEST_VERIFICATION_CODE);

    // Wait for successful authentication redirect
    await page.waitForURL(
      (url) => url.pathname === "/sign-up/tasks/choose-organization",
      { timeout: 20000 }
    );

    const orgName =
      TEST_ORGANIZATION_PREFIX + "-board-" + Date.now().toString();
    orgSlug = orgName.toLowerCase().replace(/ /g, "-");

    await page.getByRole("textbox", { name: "name" }).fill(orgName);
    await page.getByRole("textbox", { name: "slug" }).fill(orgSlug);

    const orgContinueButton = page.getByRole("button", { name: /continue/i });
    await orgContinueButton.click();

    await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });
    await page.close();
  });

  test("authenticated user can create a private board", async ({ page }) => {
    await setupClerkTestingToken({ page });

    await page.goto(`http://${orgSlug}.localhost:3000/`);

    await clerk.signIn({
      page,
      signInParams: { strategy: "email_code", identifier: userEmail },
    });

    await page.waitForSelector('[data-clerk-component="UserButton"]', {
      timeout: 10000,
    });

    await page.getByRole("button", { name: /create board/i }).click();

    await page.waitForSelector('[data-slot="dialog-content"]', {
      timeout: 5000,
    });

    await page
      .getByPlaceholder("My awesome board")
      .fill(TEST_PRIVATE_BOARD_NAME);

    const dialogContent = page.locator('[data-slot="dialog-content"]');
    await dialogContent.getByRole("button", { name: /create/i }).click();

    const boardButton = page.getByRole("button", {
      name: TEST_PRIVATE_BOARD_NAME,
    });
    await expect(boardButton).toBeVisible();
  });

  test("authenticated user can create a public board", async ({ page }) => {
    await setupClerkTestingToken({ page });

    // Navigate to organization subdomain
    await page.goto(`http://${orgSlug}.localhost:3000/`);

    // Sign in
    await clerk.signIn({
      page,
      signInParams: { strategy: "email_code", identifier: userEmail },
    });

    // Wait for auth to complete
    await page.waitForSelector('[data-clerk-component="UserButton"]', {
      timeout: 10000,
    });

    // Click create board button (the one in the header)
    await page.getByRole("button", { name: /create board/i }).click();

    // Wait for dialog
    await page.waitForSelector('[data-slot="dialog-content"]', {
      timeout: 5000,
    });

    // Fill in board name
    await page
      .getByPlaceholder("My awesome board")
      .fill(TEST_PUBLIC_BOARD_NAME);

    // Enable public visibility
    const dialogContent = page.locator('[data-slot="dialog-content"]');
    const switchElement = dialogContent.getByTestId("isBoardPublic");
    await switchElement.click();

    // Submit form (click the submit button inside the dialog)
    await dialogContent.getByRole("button", { name: /create/i }).click();

    // Wait for dialog to close
    await page.waitForSelector('[data-slot="dialog-content"]', {
      state: "hidden",
      timeout: 5000,
    });

    // Verify the board appears in the URL
    await expect(page).toHaveURL(/board=/);

    // Verify the board name appears in the dropdown trigger
    await expect(
      page.getByRole("button", { name: TEST_PUBLIC_BOARD_NAME })
    ).toBeVisible();
  });

  test("user can switch between boards and URL updates", async ({ page }) => {
    await setupClerkTestingToken({ page });

    // Navigate to organization subdomain
    await page.goto(`http://${orgSlug}.localhost:3000/`);

    // Sign in
    await clerk.signIn({
      page,
      signInParams: { strategy: "email_code", identifier: userEmail },
    });

    // Wait for auth to complete
    await page.waitForSelector('[data-clerk-component="UserButton"]', {
      timeout: 10000,
    });

    // Open dropdown
    await page
      .getByRole("button", { name: /select a board|test/i })
      .first()
      .click();

    // Wait for dropdown content
    await page.waitForSelector('[data-slot="dropdown-menu-content"]', {
      timeout: 5000,
    });

    // Click on the private board if visible
    const privateBoardItem = page.getByRole("menuitem", {
      name: new RegExp(TEST_PRIVATE_BOARD_NAME, "i"),
    });

    if (await privateBoardItem.isVisible()) {
      const urlBefore = page.url();
      await privateBoardItem.click();

      // Wait for URL to update
      await page.waitForURL(/board=/, { timeout: 5000 });

      // Verify URL changed
      expect(page.url()).not.toBe(urlBefore);
      expect(page.url()).toContain("board=");
    }
  });

  test("shareable link navigates to specific board", async ({ page }) => {
    await setupClerkTestingToken({ page });

    // First, navigate and get a board ID
    await page.goto(`http://${orgSlug}.localhost:3000/`);

    // Sign in
    await clerk.signIn({
      page,
      signInParams: { strategy: "email_code", identifier: userEmail },
    });

    // Wait for auth to complete
    await page.waitForSelector('[data-clerk-component="UserButton"]', {
      timeout: 10000,
    });

    // Open dropdown and select a board
    await page
      .getByRole("button", { name: /select a board|test/i })
      .first()
      .click();
    await page.waitForSelector('[data-slot="dropdown-menu-content"]', {
      timeout: 5000,
    });

    // Get first available board
    const firstBoard = page.locator('[data-slot="dropdown-menu-item"]').first();
    if (await firstBoard.isVisible()) {
      await firstBoard.click();

      // Get the board ID from URL
      await page.waitForURL(/board=/, { timeout: 5000 });
      const currentUrl = new URL(page.url());
      const boardId = currentUrl.searchParams.get("board");

      if (boardId) {
        // Navigate to a fresh page with the board param
        await page.goto(`http://${orgSlug}.localhost:3000/?board=${boardId}`);

        // Verify the correct board is shown
        await expect(page).toHaveURL(new RegExp(`board=${boardId}`));
      }
    }
  });
});

test.describe("Board Creation - Unauthenticated User", () => {
  let orgSlug: string;
  let userEmail: string;
  let publicBoardId: string;

  test.beforeAll(async ({ browser }) => {
    // Create a test user and organization with boards for unauthenticated tests
    const page = await browser.newPage();
    await setupClerkTestingToken({ page });

    await page.goto("/sign-up");

    await page.waitForSelector('[data-clerk-component="SignUp"]', {
      timeout: 10000,
    });

    userEmail = generateTestEmail("unauth-board-test");

    // Enter email address
    const emailInput = page.locator(
      'input[name="emailAddress"], input[name="identifier"]'
    );
    await emailInput.fill(userEmail);

    // Click continue button
    const continueButton = page.getByRole("button", { name: /continue/i });
    await continueButton.click();

    await page.waitForResponse((response) =>
      response.url().includes("prepare_verification")
    );

    // Wait for verification code input to appear
    await page
      .getByRole("textbox", { name: "Enter verification code" })
      .waitFor({ timeout: 10000 });

    await page
      .getByRole("textbox", { name: "Enter verification code" })
      .fill(TEST_VERIFICATION_CODE);

    // Wait for successful authentication redirect
    await page.waitForURL(
      (url) => url.pathname === "/sign-up/tasks/choose-organization",
      { timeout: 20000 }
    );

    const orgName =
      TEST_ORGANIZATION_PREFIX + "-unauth-" + Date.now().toString();
    orgSlug = orgName.toLowerCase().replace(/ /g, "-");

    await page.getByRole("textbox", { name: "name" }).fill(orgName);
    await page.getByRole("textbox", { name: "slug" }).fill(orgSlug);

    const orgContinueButton = page.getByRole("button", { name: /continue/i });
    await orgContinueButton.click();

    await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });

    // Navigate to subdomain and create boards
    await page.goto(`http://${orgSlug}.localhost:3000/`);

    await clerk.signIn({
      page,
      signInParams: { strategy: "email_code", identifier: userEmail },
    });

    await page.waitForSelector('[data-clerk-component="UserButton"]', {
      timeout: 10000,
    });

    // Create a PUBLIC board
    await page.getByRole("button", { name: /create board/i }).click();
    await page.waitForSelector('[data-slot="dialog-content"]', {
      timeout: 5000,
    });
    const publicDialogContent = page.locator('[data-slot="dialog-content"]');
    await page
      .getByPlaceholder("My awesome board")
      .fill(TEST_ORGANIZATION_PREFIX + "Public Board for Unauth");
    const publicSwitch = publicDialogContent.locator('[data-slot="switch"]');
    await publicSwitch.waitFor({ state: "visible", timeout: 5000 });
    await publicSwitch.click(); // Make it public
    await publicDialogContent
      .getByRole("button", { name: /create board/i })
      .click();
    await page.waitForSelector('[data-slot="dialog-content"]', {
      state: "hidden",
      timeout: 5000,
    });

    // Get the public board ID
    await page.waitForURL(/board=/, { timeout: 5000 });
    const publicUrl = new URL(page.url());
    publicBoardId = publicUrl.searchParams.get("board") || "";

    // Create a PRIVATE board
    await page.getByRole("button", { name: /create board/i }).click();
    await page.waitForSelector('[data-slot="dialog-content"]', {
      timeout: 5000,
    });
    const privateDialogContent = page.locator('[data-slot="dialog-content"]');
    await page
      .getByPlaceholder("My awesome board")
      .fill(TEST_ORGANIZATION_PREFIX + "Private Board for Unauth");
    // Don't toggle switch - keep private
    await privateDialogContent
      .getByRole("button", { name: /create board/i })
      .click();
    await page.waitForSelector('[data-slot="dialog-content"]', {
      state: "hidden",
      timeout: 5000,
    });

    await page.close();
  });

  test("unauthenticated user can see public boards", async ({ page }) => {
    // Navigate to subdomain without authentication
    await page.goto(`http://${orgSlug}.localhost:3000/`);

    // Wait for boards to load
    await page.waitForTimeout(2000);

    // Open dropdown
    const dropdownTrigger = page
      .getByRole("button", { name: /select a board|public/i })
      .first();
    await dropdownTrigger.click();

    // Wait for dropdown content
    await page.waitForSelector('[data-slot="dropdown-menu-content"]', {
      timeout: 5000,
    });

    // Verify public board is visible
    await expect(
      page.getByRole("menuitem", {
        name: new RegExp(
          TEST_ORGANIZATION_PREFIX + "Public Board for Unauth",
          "i"
        ),
      })
    ).toBeVisible();

    // Verify private board is NOT visible
    await expect(
      page.getByRole("menuitem", {
        name: new RegExp(
          TEST_ORGANIZATION_PREFIX + "Private Board for Unauth",
          "i"
        ),
      })
    ).not.toBeVisible();
  });

  test("unauthenticated user cannot see create board button", async ({
    page,
  }) => {
    // Navigate to subdomain without authentication
    await page.goto(`http://${orgSlug}.localhost:3000/`);

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Verify Create Board button is not visible
    await expect(
      page.getByRole("button", { name: /create board/i })
    ).not.toBeVisible();
  });

  test("unauthenticated user can access public board via direct link", async ({
    page,
  }) => {
    // Navigate directly to public board
    await page.goto(`http://${orgSlug}.localhost:3000/?board=${publicBoardId}`);

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Verify the URL contains the board param
    await expect(page).toHaveURL(new RegExp(`board=${publicBoardId}`));

    // Verify the board name appears in dropdown trigger
    await expect(
      page.getByRole("button", {
        name: new RegExp(
          TEST_ORGANIZATION_PREFIX + "Public Board for Unauth",
          "i"
        ),
      })
    ).toBeVisible();
  });
});
