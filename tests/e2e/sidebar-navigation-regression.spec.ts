import { expect, test } from "@playwright/test"

test.describe("responsive sidebar navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test("closes the drawer and changes routes after a destination is selected", async ({ page }) => {
    await page.goto("/reports")

    await page.getByRole("button", { name: "Toggle navigation menu" }).click()
    await expect(page.getByRole("dialog", { name: "Sidebar" })).toBeVisible()

    await page.getByRole("link", { name: "Navigate to Progress Charts" }).click()

    await expect(page).toHaveURL(/\/charts$/)
    await expect(page.getByRole("heading", { name: "See the trend before you change the plan." })).toBeVisible()
    await expect(page.getByRole("dialog", { name: "Sidebar" })).toBeHidden()
  })
})
