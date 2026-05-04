import { test, expect } from "@playwright/test";

test("LP Sarah renders critical content", async ({ page }) => {
  await page.goto("/lp/toddler-capitol-hill");
  await expect(page.locator("h1")).toContainText("Not a chain. Not a lottery.");
  await expect(page.getByText("AMI Authentic")).toBeVisible();
  await expect(page.getByRole("button", { name: /Send request/i })).toBeVisible();
  await expect(page.getByText("Tuition rates vary based on our program schedules.")).toBeVisible();
});
