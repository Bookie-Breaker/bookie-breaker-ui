import { expect, test } from "@playwright/test"

test.describe("edge viewing", () => {
  test("edges table lists edges with filters and sorting controls", async ({ page }) => {
    await page.goto("/edges")
    await expect(page.getByRole("heading", { name: "Edges" })).toBeVisible()
    await expect(page.getByText("LAL -3.5")).toBeVisible()
    await expect(page.getByText("+4.20%")).toBeVisible()
    await expect(page.getByLabel("League")).toBeVisible()
    await expect(page.getByLabel("Sort by")).toBeVisible()
  })

  test("edge detail renders probabilities, charts, and expired simulations", async ({ page }) => {
    await page.goto("/edges")
    await page.getByRole("link", { name: /BOS @ LAL/ }).click()
    await expect(page.getByRole("heading", { name: /LAL -3\.5/ })).toBeVisible()
    await expect(page.getByText("Model probability")).toBeVisible()
    await expect(page.getByText("56.2%").first()).toBeVisible()
    await expect(page.getByRole("heading", { name: "Feature importance" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Line movement" })).toBeVisible()
    // charts render to canvas
    await expect(page.locator("canvas").first()).toBeVisible()
    // simulation results expired in the stub -> explicit empty state
    await expect(page.getByText("Simulation expired")).toBeVisible()
    await expect(page.getByRole("link", { name: "Bet this edge" })).toBeVisible()
  })

  test("home dashboard shows pipeline status and active edges", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("Active edges")).toBeVisible()
    await expect(page.getByText("All-time ROI")).toBeVisible()
    await expect(page.getByRole("button", { name: "Run pipeline" })).toBeVisible()
  })

  test("slate lists games with prediction and edge chips", async ({ page }) => {
    await page.goto("/slate")
    await expect(page.getByText("Boston Celtics @ Los Angeles Lakers")).toBeVisible()
    await expect(page.getByRole("link", { name: /SPREAD LAL -3\.5/ })).toBeVisible()
  })
})
