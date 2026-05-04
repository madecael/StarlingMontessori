import { test, expect } from "@playwright/test";

test("LP D&M renders Primary 2026 critical content", async ({ page }) => {
  await page.goto("/lp/primary-2026");
  await expect(page.locator("h1")).toContainText("AMI Primary classroom");
  await expect(page.getByText("Aug 2026").first()).toBeVisible();
  await expect(page.getByText("Saint Mark Episcopal").first()).toBeVisible();
  await expect(page.getByText("Three-year cycle, intact")).toBeVisible();
  await expect(page.getByLabel(/CURRENT MONTESSORI/i)).toBeVisible();
});
