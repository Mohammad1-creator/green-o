import { expect, type Page, test } from "@playwright/test";

/** Demo accounts created by scripts/seed-dev.mts. */
export const DEMO = {
  developer: "0001",
  generalManager: "1000",
  maintenanceManager: "2000",
  maintenanceTech: "2001",
  maintenanceTech2: "2002",
  productionManager: "3000",
  productionWorker: "3001",
  productionWorker2: "3002",
  qualityInspector: "4001",
} as const;

export const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? "Local-Demo-2026";

/** Random digits, so parallel test projects never pick the same value. */
export function randomDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

/**
 * An app alert containing this text. (Next.js also renders an empty
 * role="alert" route announcer, so the role alone is ambiguous.)
 */
export function alertWith(page: Page, text: string) {
  return page.getByRole("alert").filter({ hasText: text });
}

/** A fresh password for accounts created during a test. */
export function newPassword(): string {
  return `E2e-${randomDigits(6)}-${randomDigits(4)}`;
}

/** Flows that sign in need Supabase with the demo data (CI provides both). */
export function requireSupabase() {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "needs a running Supabase with demo data",
  );
}

export async function signIn(
  page: Page,
  employeeNo: string,
  password = DEMO_PASSWORD,
) {
  await page.goto("/login");
  await page.getByLabel("رقم الموظف").fill(employeeNo);
  await page.getByLabel("كلمة المرور").fill(password);
  await page.getByRole("button", { name: "دخول" }).click();
}

/** Signs in and waits until the app has left the login page. */
export async function signInAs(
  page: Page,
  employeeNo: string,
  password = DEMO_PASSWORD,
) {
  await signIn(page, employeeNo, password);
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "تسجيل الخروج" }).first().click();
  await expect(page).toHaveURL(/\/login/);
}
