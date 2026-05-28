import { test, expect } from "@playwright/test";

test.describe("Ladder /guide flow", () => {
  test("submits the guide form and shows confirmation", async ({ page }) => {
    // Route-intercept /api/guide-request to return 200 ok
    await page.route("**/api/guide-request", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    );

    await page.goto("/guide");
    // The SiteHero renders an h1 that includes "The Preschool Decision Guide."
    await expect(page.locator("h1")).toContainText("Preschool Decision Guide");

    // GuideForm labels are <span> text inside <label> elements — uppercase
    await page.getByLabel(/YOUR NAME/i).fill("Test Parent");
    // Use name attribute selector since label text "EMAIL" is in a span, not a <label for="...">
    await page.locator('input[name="email"]').fill("test@example.com");

    // Submit button text: "Send me the guide"
    await page.getByRole("button", { name: /send me the guide/i }).click();

    // Confirmation: the wrap is replaced with "CHECK YOUR INBOX" eyebrow text
    await expect(page.getByText(/check your inbox/i)).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe("Ladder /roadmap quiz flow", () => {
  test("walks all 8 steps and submits", async ({ page }) => {
    await page.route("**/api/roadmap-request", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    );

    await page.goto("/roadmap");
    // SiteHero h1 contains "Your preschool decision roadmap."
    await expect(page.locator("h1")).toContainText("preschool decision roadmap");

    // Step 1 — startDate: "This summer or sooner"
    await page.getByText("This summer or sooner").click();
    await page.getByRole("button", { name: /^Continue$/i }).click();

    // Step 2 — childAge: "3–4 years" (uses an en-dash in the source)
    await page.getByText("3–4 years").click();
    await page.getByRole("button", { name: /^Continue$/i }).click();

    // Step 3 — schedule: "Full-day"
    await page.getByText("Full-day").click();
    await page.getByRole("button", { name: /^Continue$/i }).click();

    // Step 4 — visitsSoFar: "Visited 1–2"
    await page.getByText("Visited 1–2").click();
    await page.getByRole("button", { name: /^Continue$/i }).click();

    // Step 5 — montessoriInterest: "Curious, but comparing approaches"
    await page.getByText("Curious, but comparing approaches").click();
    await page.getByRole("button", { name: /^Continue$/i }).click();

    // Step 6 — topConcern: "Finding the right fit"
    await page.getByText("Finding the right fit").click();
    await page.getByRole("button", { name: /^Continue$/i }).click();

    // Step 7 — zip: use id selector for clarity
    await page.locator("#rq-zip").fill("20003");
    await page.getByRole("button", { name: /^Continue$/i }).click();

    // Step 8 — name + email: use id selectors for unambiguous targeting
    await page.locator("#rq-name").fill("Test Parent");
    await page.locator("#rq-email").fill("test@example.com");
    await page.getByRole("button", { name: /send my roadmap/i }).click();

    // Confirmation: wrap is replaced with heading "Your roadmap is on its way."
    await expect(
      page.getByRole("heading", { name: /your roadmap is on its way/i })
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Ladder CTAs visible on homepage", () => {
  test("home page shows three ladder CTA cards", async ({ page }) => {
    await page.goto("/");
    // LadderCTA renders uppercase eyebrow divs
    await expect(page.getByText("STILL EXPLORING")).toBeVisible();
    await expect(page.getByText("READY TO PLAN")).toBeVisible();
    await expect(page.getByText("READY TO VISIT")).toBeVisible();
  });
});
