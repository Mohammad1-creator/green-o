import { expect, type Page, test } from "@playwright/test";

/** Demo accounts created by scripts/seed-dev.mts. */
export const DEMO = {
  generalManager: "1000",
  maintenanceManager: "2000",
  maintenanceTech: "2001",
  productionManager: "3000",
  productionWorker: "3001",
} as const;

export const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? "Local-Demo-2026";

/** Random digits, so parallel test projects never pick the same value. */
export function randomDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
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

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "تسجيل الخروج" }).first().click();
  await expect(page).toHaveURL(/\/login/);
}
