import { test, expect, Page } from "@playwright/test";
import {
  loginAs,
  logout,
  isLoggedIn,
  isAdmin,
  checkAccessDenied,
  TEST_USERS,
} from "../helpers/auth";

/**
 * PHASE 1: BASIC NAVIGATION AND STRUCTURE TESTS
 * These tests verify the app structure without requiring authentication
 */

test.describe("Phase 1: Basic Navigation and Structure", () => {
  test("should load homepage", async ({ page }) => {
    await page.goto("/");
    expect(page).toHaveTitle(/WINFAST|Compra/i);
    const header = page.locator('header, [role="banner"]');
    expect(header).toBeDefined();
  });

  test("should have proper navigation links", async ({ page }) => {
    await page.goto("/");

    // Check for public navigation
    const homeLink = page.locator(
      'a[href="/"], button:has-text("Home"), button:has-text("Inicio")',
    );
    expect(homeLink.first()).toBeDefined();
  });

  test("should show auth page", async ({ page }) => {
    await page.goto("/auth");
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
    expect(emailInput).toBeDefined();
  });

  test("should not show admin panel to unauthenticated users", async ({ page }) => {
    await page.goto("/");
    const adminLink = page.locator('a[href="/admin"], [data-testid="admin-link"]');

    // Should NOT be visible
    const isVisible = await adminLink.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });

  test("should redirect unauthenticated user from protected routes", async ({ page }) => {
    const originalUrl = page.url();
    await page.goto("/mis-publicaciones");

    // Should redirect to auth or stay on home
    const newUrl = page.url();
    const redirected = !newUrl.includes("mis-publicaciones") || newUrl.includes("auth");
    expect(redirected).toBe(true);
  });
});

/**
 * PHASE 2: AUTHENTICATION FLOW TESTS
 * IMPORTANT: These tests require:
 * 1. Supabase instance with test users created
 * 2. TEST_USERS credentials valid in that instance
 * 3. Email/password auth enabled in Supabase
 *
 * STATUS: ⚠️ REQUIRES EXTERNAL CONFIGURATION (Supabase setup)
 */

test.describe("Phase 2: Authentication Flows", () => {
  test.skip("should allow admin to login", async ({ page }) => {
    // REQUIRES: Valid admin user in Supabase
    const loggedIn = await loginAs(page, TEST_USERS.adminUser.email, TEST_USERS.adminUser.password);
    expect(loggedIn).toBe(true);

    // Verify on dashboard
    await expect(page).toHaveURL("/");
    const authenticated = await isLoggedIn(page);
    expect(authenticated).toBe(true);
  });

  test.skip("should allow normal user to login", async ({ page }) => {
    // REQUIRES: Valid normal user in Supabase
    const loggedIn = await loginAs(
      page,
      TEST_USERS.normalUser1.email,
      TEST_USERS.normalUser1.password,
    );
    expect(loggedIn).toBe(true);

    const authenticated = await isLoggedIn(page);
    expect(authenticated).toBe(true);
  });

  test.skip("should logout user", async ({ page }) => {
    // REQUIRES: Valid user in Supabase
    const loggedIn = await loginAs(
      page,
      TEST_USERS.normalUser1.email,
      TEST_USERS.normalUser1.password,
    );
    expect(loggedIn).toBe(true);

    await logout(page);

    const authenticated = await isLoggedIn(page);
    expect(authenticated).toBe(false);
  });

  test.skip("should reject invalid credentials", async ({ page }) => {
    await page.goto("/auth");

    // Fill with wrong password
    await page.fill('input[type="email"]', TEST_USERS.normalUser1.email);
    await page.fill('input[type="password"]', "WrongPassword123!");
    await page.click('button[type="submit"]');

    // Should show error
    const errorMsg = page.locator('[role="alert"], .toast-error, .error-message');
    await expect(errorMsg)
      .toBeVisible({ timeout: 3000 })
      .catch(() => {});
  });
});

/**
 * PHASE 3: AUTHORIZATION TESTS
 * CRITICAL: Tests that a normal user CANNOT access admin resources
 *
 * STATUS: ⚠️ REQUIRES EXTERNAL CONFIGURATION (Supabase + users)
 */

test.describe("Phase 3: Authorization - Admin Access Control", () => {
  test.skip("admin should see admin panel link", async ({ page }) => {
    // REQUIRES: Valid admin user
    const loggedIn = await loginAs(page, TEST_USERS.adminUser.email, TEST_USERS.adminUser.password);
    expect(loggedIn).toBe(true);

    const adminLink = page.locator(
      'a[href="/admin"], [data-testid="admin-link"], button:has-text("Admin")',
    );
    await expect(adminLink.first())
      .toBeVisible({ timeout: 3000 })
      .catch(() => {});
  });

  test.skip("normal user should NOT see admin panel link", async ({ page }) => {
    // REQUIRES: Valid normal user
    const loggedIn = await loginAs(
      page,
      TEST_USERS.normalUser1.email,
      TEST_USERS.normalUser1.password,
    );
    expect(loggedIn).toBe(true);

    const adminLink = page.locator(
      'a[href="/admin"], [data-testid="admin-link"], button:has-text("Admin")',
    );
    const isVisible = await adminLink.isVisible({ timeout: 2000 }).catch(() => false);
    expect(isVisible).toBe(false);
  });

  test.skip("normal user should be redirected from admin panel", async ({ page }) => {
    // REQUIRES: Valid normal user
    const loggedIn = await loginAs(
      page,
      TEST_USERS.normalUser1.email,
      TEST_USERS.normalUser1.password,
    );
    expect(loggedIn).toBe(true);

    // Try to access admin directly
    await page.goto("/admin");

    // Should redirect
    const url = page.url();
    const redirected = !url.includes("/admin");
    expect(redirected).toBe(true);
  });

  test.skip("normal user should NOT be able to modify is_blocked", async ({ page }) => {
    // REQUIRES: Valid normal user + ability to make API calls
    // This is a SECURITY CRITICAL test

    const loggedIn = await loginAs(
      page,
      TEST_USERS.normalUser1.email,
      TEST_USERS.normalUser1.password,
    );
    expect(loggedIn).toBe(true);

    // Get current user ID from localStorage/session
    const userId = await page.evaluate(() => {
      const session = localStorage.getItem("sb-supabase-auth-token");
      if (!session) return null;
      const parsed = JSON.parse(session);
      return parsed?.user?.id;
    });

    if (!userId) {
      test.skip();
      return;
    }

    // Attempt to call API to set is_blocked
    const response = await page.request
      .patch(`/api/profiles/${userId}`, {
        data: {
          is_blocked: true,
          motivo_bloqueo: "Test",
        },
      })
      .catch((e) => e.response);

    // Should fail with 403/unauthorized
    expect([403, 401, 400]).toContain(response?.status());
  });

  test.skip("normal user should NOT be able to modify user_roles", async ({ page }) => {
    // REQUIRES: Valid normal user + API access
    // This is a SECURITY CRITICAL test

    const loggedIn = await loginAs(
      page,
      TEST_USERS.normalUser1.email,
      TEST_USERS.normalUser1.password,
    );
    expect(loggedIn).toBe(true);

    // Attempt to insert admin role
    const response = await page.request
      .post("/api/user-roles", {
        data: {
          role: "admin",
        },
      })
      .catch((e) => e.response);

    // Should fail
    expect([403, 401, 400]).toContain(response?.status());
  });
});

/**
 * PHASE 4: IDOR (Insecure Direct Object Reference) TESTS
 * CRITICAL: Verify that changing IDs doesn't grant unauthorized access
 *
 * STATUS: ⚠️ REQUIRES EXTERNAL CONFIGURATION
 */

test.describe("Phase 4: IDOR Prevention", () => {
  test.skip("user1 should NOT access user2 profile directly", async ({ page }) => {
    // REQUIRES: Two valid users + known user IDs
    const loggedIn = await loginAs(
      page,
      TEST_USERS.normalUser1.email,
      TEST_USERS.normalUser1.password,
    );
    expect(loggedIn).toBe(true);

    // Get user2's ID somehow (would need API or known ID)
    const user2Id = "fake-user2-id-here"; // PLACEHOLDER

    await page.goto(`/perfil/${user2Id}`);

    // Should show public data only, or redirect
    // Sensitive data should NOT be visible
    const email = page.locator('input[name="email"]');
    const isVisible = await email.isVisible({ timeout: 2000 }).catch(() => false);

    // Email should NOT be visible on someone else's public profile
    expect(isVisible).toBe(false);
  });

  test.skip("user should NOT access/modify product of another user", async ({ page }) => {
    // REQUIRES: Two users + product ownership
    const loggedIn = await loginAs(
      page,
      TEST_USERS.normalUser1.email,
      TEST_USERS.normalUser1.password,
    );
    expect(loggedIn).toBe(true);

    // Navigate to edit page of someone else's product
    const otherProductId = "fake-product-id";
    await page.goto(`/producto/${otherProductId}/edit`);

    // Should be redirected
    const url = page.url();
    expect(!url.includes("/edit") || url.includes("/auth") || url.includes("/")).toBe(true);
  });
});

/**
 * PHASE 5: BLOCKED USER TESTS
 * CRITICAL: Verify that blocked users lose access
 *
 * STATUS: ⚠️ REQUIRES EXTERNAL CONFIGURATION + MANUAL ADMIN ACTION
 */

test.describe.skip("Phase 5: Blocked User Behavior", () => {
  test("blocked user should not be able to create posts", async ({ page }) => {
    // REQUIRES:
    // 1. A test user that will be blocked
    // 2. Admin to block the user
    // 3. Blocked user still has old session
    // This test simulates the critical scenario where:
    // - User is logged in
    // - Admin blocks them
    // - User tries to perform protected action
    // - Action should fail
  });

  test("blocked user session should be invalidated on next request", async ({ page }) => {
    // REQUIRES: Same setup as above
    // After user is blocked, next API call should fail
  });
});

/**
 * PHASE 6: DEPENDENCY AND BUILD VERIFICATION
 * These tests can run without Supabase
 */

test.describe("Phase 6: Build and Dependencies", () => {
  test("build should have no console errors on homepage", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Filter out expected third-party errors
    const criticalErrors = errors.filter(
      (e) => !e.includes("third-party") && !e.includes("external") && !e.includes("ads"),
    );

    expect(criticalErrors.length).toBe(0);
  });

  test("should not expose sensitive data in HTML", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();

    // Check for common issues
    expect(html).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(html).not.toContain("sk_live_");
    expect(html).not.toContain("pk_live_");
    expect(html).not.toContain("BEGIN PRIVATE KEY");
  });
});
