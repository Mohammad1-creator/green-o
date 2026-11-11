import { expect, type Page, test } from "@playwright/test";

import { DEMO, requireSupabase, signInAs } from "./helpers";

/** Collects the browser's Content Security Policy complaints. */
function watchPolicy(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/content.security.policy/i.test(message.text())) {
      violations.push(message.text());
    }
  });
  return violations;
}

test("pages carry the security headers", async ({ page }) => {
  const response = await page.goto("/login");
  const headers = response?.headers() ?? {};
  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("the main screens work within the policy", async ({ browser }) => {
  requireSupabase();

  const worker = await (await browser.newContext()).newPage();
  const workerViolations = watchPolicy(worker);
  await signInAs(worker, DEMO.productionWorker);
  for (const path of ["/m", "/m/production", "/m/faults", "/m/notifications"]) {
    await worker.goto(path);
    await expect(worker.locator("main")).toBeVisible();
  }

  const manager = await (await browser.newContext()).newPage();
  const managerViolations = watchPolicy(manager);
  await signInAs(manager, DEMO.generalManager);
  for (const path of ["/admin", "/admin/tasks", "/admin/reports"]) {
    await manager.goto(path);
    await expect(manager.locator("main")).toBeVisible();
  }

  expect([...workerViolations, ...managerViolations]).toEqual([]);
});
