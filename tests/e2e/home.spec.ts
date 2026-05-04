import { test, expect } from "@playwright/test";

test("Home renders critical content", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Soaring minds");
  await expect(page.getByRole("link", { name: /Schedule a tour/i }).first()).toBeVisible();
  await expect(page.getByText("Toddler Community").first()).toBeVisible();
  await expect(page.getByText("NEW · AUG 2026")).toBeVisible();
});
