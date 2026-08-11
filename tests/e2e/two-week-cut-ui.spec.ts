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
    await expect(page.getByRole("link", { name: /^Plans$/i }).first()).toBeVisible()
  })

  test("Plans separates standard creation from the guided 14-day workflow", async ({ page }) => {
    await page.goto("/plans", { waitUntil: "domcontentloaded" })

    await expect(page.getByRole("heading", { name: "Start or change a plan" })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("button", { name: /Start a standard cut/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Start a 14-day cut/i })).toBeVisible()
    await expect(page.getByText("Which two source weeks should be used?")).not.toBeVisible()

    await page.getByRole("button", { name: /Start a standard cut/i }).click()
    await page.getByRole("button", { name: "22 weeks" }).click()
    await expect(page.getByRole("link", { name: /Review profile and start plan/i })).toHaveAttribute("href", /weeks=22/)

    await page.getByRole("button", { name: /Start a 14-day cut/i }).click()
    const progressRail = page.getByRole("navigation", { name: "14-day setup progress" })
    await expect(progressRail).toBeVisible()
    const progressColumns = await progressRail.locator("ol").evaluate((element) => (
      getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length
    ))
    expect(progressColumns).toBe(5)
    await expect(page.getByRole("heading", { name: "Basics" })).toBeVisible()
    await page.getByRole("button", { name: /Continue to diet and training/i }).click()
    await expect(page.getByRole("heading", { name: "Diet and training" })).toBeVisible()
    await page.getByRole("button", { name: /Continue to PED schedule/i }).click()
    await expect(page.getByRole("heading", { name: "PED schedule and inventory" })).toBeVisible()
    await expect(page.getByLabel("Which two source weeks should be used?")).toBeVisible()
    await expect(page.getByRole("heading", { name: "PED inventory & exact coverage" })).toBeVisible()
  })

  test("guided Plans contains its progress rail on a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/plans", { waitUntil: "domcontentloaded" })

    await expect(page.getByRole("heading", { name: "Start or change a plan" })).toBeVisible({ timeout: 30_000 })
    await page.getByRole("button", { name: /Start a 14-day cut/i }).click()
    const progressRail = page.getByRole("navigation", { name: "14-day setup progress" })
    await expect(progressRail).toBeVisible()

    const widths = await progressRail.evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
      documentClient: document.documentElement.clientWidth,
      documentScroll: document.documentElement.scrollWidth,
    }))
    expect(widths.scroll).toBeGreaterThan(widths.client)
    expect(widths.documentScroll).toBe(widths.documentClient)
  })

  test("Plans restores a safe in-progress 14-day step without restoring a final preview", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("apexfit.plan-wizard.v1", JSON.stringify({
        planKind: "challenge",
        standardWeeks: 15,
        challengeStep: 5,
        startDate: "2026-08-11",
        startWeek: 9,
      }))
    })
    await page.goto("/plans", { waitUntil: "domcontentloaded" })

    await expect(page.getByRole("heading", { name: "Readiness" })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("button", { name: /Review my plan/i })).toBeDisabled()
    await expect(page.getByText(/Setup choices saved in this browser/i)).toBeVisible()
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
