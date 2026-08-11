import { expect, test } from "@playwright/test"

test.describe("Quiet Strength dashboard and 14-day challenge", () => {
  test("dashboard keeps core widgets and exposes the new plan workflow", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })

    await expect(page.getByText(/Good morning,/)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText("Today’s mission")).toBeVisible()
    await expect(page.getByText("Body fat trend")).toBeVisible()
    await expect(page.getByText("Nutrition & adherence")).toBeVisible()
    await expect(page.getByText("Latest measurements")).toBeVisible()
    await expect(page.getByText("AI Coach insight")).toBeVisible()
    await expect(page.getByRole("link", { name: /Plan Studio/i }).first()).toBeVisible()
  })

  test("Plan Studio binds a complete source window into a 14-day preview", async ({ page }) => {
    await page.goto("/plans", { waitUntil: "domcontentloaded" })

    await expect(page.getByRole("heading", { name: "Build the plan. Keep the life." })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("combobox", { name: "Start from source week" })).toBeVisible()
    await page.getByRole("button", { name: /Build exact preview/i }).click()

    await expect(page.getByText("Average calories")).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText("14", { exact: true }).first()).toBeVisible()
    await expect(page.getByText(/Protocol source weeks/)).toBeVisible()
    await expect(page.getByText(/Safety acknowledgement is required/)).toBeVisible()
  })

  test("template editor exposes all fourteen editable days and revision history", async ({ page }) => {
    await page.goto("/challenge/template", { waitUntil: "domcontentloaded" })

    await expect(page.getByRole("heading", { name: "Two-Week Cut Template Editor" })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText("Fourteen-day execution calendar")).toBeVisible()
    await expect(page.getByText("Revision history")).toBeVisible()
    await expect(page.getByRole("button", { name: "Duplicate current revision" })).toBeVisible()
    await expect(page.locator('input[value="Final measurements"]')).toBeVisible()
  })
})
