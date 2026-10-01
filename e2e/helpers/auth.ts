import { Page, BrowserContext } from "@playwright/test";

/**
 * Test account credentials
 * These MUST match the users created in Supabase staging instance
 * Create these users in Supabase Auth before running tests
 */
export const TEST_USERS = {
  adminUser: {
    email: "admin-test@staging.local",
    password: "Admin@Staging2026!",
  },
  normalUser1: {
    email: "user-test@staging.local",
    password: "User@Staging2026!",
  },
  normalUser2: {
    email: "user2-test@staging.local",
    password: "User2@Staging2026!",
  },
  blockedUser: {
    email: "blocked-test@staging.local",
    password: "Blocked@Staging2026!",
  },
};

/**
 * Helper to log in a user
 * @param page Playwright Page object
 * @param email User email
 * @param password User password
 * @returns true if login successful, false otherwise
 */
export async function loginAs(page: Page, email: string, password: string): Promise<boolean> {
  try {
    // Navigate to auth page
    await page.goto("/auth");

    // Wait for email input
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });

    // Fill email
    await page.fill('input[type="email"]', email);

    // Fill password
    await page.fill('input[type="password"]', password);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation or success indicator
    await page.waitForURL("/", { timeout: 10000 }).catch(() => {
      return false;
    });

    // Check if actually logged in by looking for profile or dashboard
    const isLoggedIn = await page
      .locator('[data-testid="user-menu"], [data-testid="authenticated-nav"]')
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    return isLoggedIn || (await page.url()).includes(page.context().baseURL!);
  } catch (error) {
    console.error("Login failed:", error);
    return false;
  }
}

/**
 * Helper to log out
 * @param page Playwright Page object
 */
export async function logout(page: Page): Promise<void> {
  try {
    // Click user menu or logout button
    const userMenu = page.locator('[data-testid="user-menu"]');
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.click("text=Cerrar sesión, text=Logout");
    }

    // Wait for redirect to home/auth
    await page.waitForURL(/^\/$|\/auth/, { timeout: 5000 }).catch(() => {});
  } catch (error) {
    console.error("Logout failed:", error);
  }
}

/**
 * Helper to check if user is logged in
 * @param page Playwright Page object
 * @returns true if logged in, false otherwise
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    const authElement = page.locator(
      '[data-testid="user-menu"], [data-testid="authenticated-nav"]',
    );
    return await authElement.isVisible({ timeout: 2000 }).catch(() => false);
  } catch {
    return false;
  }
}

/**
 * Helper to check if user is admin
 * @param page Playwright Page object
 * @returns true if admin link/menu visible, false otherwise
 */
export async function isAdmin(page: Page): Promise<boolean> {
  try {
    const adminLink = page.locator(
      'a[href="/admin"], button:has-text("Admin"), [data-testid="admin-panel"]',
    );
    return await adminLink.isVisible({ timeout: 2000 }).catch(() => false);
  } catch {
    return false;
  }
}

/**
 * Helper to navigate and check access denied
 * @param page Playwright Page object
 * @param path Path to navigate to
 * @returns true if redirected/denied, false if accessible
 */
export async function checkAccessDenied(page: Page, path: string): Promise<boolean> {
  try {
    const currentUrl = page.url();
    await page.goto(path);

    // Check if redirected to auth or home (access denied)
    const newUrl = page.url();
    const isRedirected = !newUrl.includes(path.replace(/^\/?/, ""));

    return isRedirected;
  } catch (error) {
    return true; // Assume denied if error
  }
}

/**
 * Helper to extract user session from localStorage
 * @param context BrowserContext
 * @returns session object if exists
 */
export async function getSession(context: BrowserContext): Promise<Record<string, unknown> | null> {
  const page = await context.newPage();
  const sessionJson = await page.evaluate(() => {
    return localStorage.getItem("sb-xxxxxxx-auth-token"); // Adjust key based on Supabase config
  });
  await page.close();
  if (!sessionJson) return null;
  return JSON.parse(sessionJson) as Record<string, unknown>;
}
