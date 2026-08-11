import { expect, test } from "@playwright/test"

test.describe("modern Apex Fit workspaces", () => {
  const destinations = [
    ["/reports", "Progress reports"],
    ["/charts", "See the trend before you change the plan."],
    ["/calculator", "Estimate body fat with the right context."],
    ["/entries", "Entry history"],
    ["/entries/new", "Record today’s measurements"],
    ["/nutrition", "Actual intake vs. PRIME targets"],
    ["/ai/chat", "Ask a better question. Get a grounded answer."],
    ["/ai/insights", "Insights you can act on."],
    ["/settings/ai", "Choose which intelligence powers each task."],
    ["/changelog", "What changed—and why it matters."],
  ] as const

  for (const [path, heading] of destinations) {
    test(`${path} keeps its primary workspace available`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" })
      await expect(page.getByRole("heading", { name: heading })).toBeVisible({ timeout: 30_000 })
      if (path === "/reports") {
        await expect(page.getByText("14-Day Cut report")).toBeVisible()
        await expect(page.getByRole("link", { name: "Build the 14-day plan" })).toBeVisible()
      }
      const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
      expect(hasHorizontalOverflow, `${path} should not overflow the viewport`).toBe(false)
    })
  }

  test("shows exactly seven user-selectable palettes in Settings", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" })

    await expect(page.getByRole("heading", { name: "Make Apex Fit work your way." })).toBeVisible({ timeout: 30_000 })
    const paletteGroup = page.getByRole("radiogroup", { name: "Color palette" })
    await expect(paletteGroup).toBeVisible()
    await expect(paletteGroup.getByRole("radio")).toHaveCount(7)
    await expect(paletteGroup.getByRole("radio", { checked: true })).toHaveCount(1)
  })
})
