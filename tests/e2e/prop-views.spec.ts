import { expect, test } from "@playwright/test"

const PROP_EDGE_OU_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
const PROP_EDGE_YES_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"

test.describe("prop views", () => {
  test("edges market-class tabs filter player props", async ({ page }) => {
    await page.goto("/edges")
    await expect(page.getByText("Bukayo Saka")).toBeVisible()
    await expect(page.getByText("LAL -3.5")).toBeVisible()

    await page.getByRole("button", { name: "Player props" }).click()
    await expect(page).toHaveURL(/market_class=props/)
    await expect(page.getByText("Bukayo Saka")).toBeVisible()
    await expect(page.getByText("Gabriel Jesus")).toBeVisible()
    await expect(page.getByText("LAL -3.5")).toBeHidden()
    // the props tab hides the game-line market select
    await expect(page.getByLabel("Market", { exact: true })).toBeHidden()

    await page.getByRole("button", { name: "Game lines" }).click()
    await expect(page).toHaveURL(/market_class=game/)
    await expect(page.getByText("Bukayo Saka")).toBeHidden()
    await expect(page.getByText("LAL -3.5")).toBeVisible()
  })

  test("prop rows show player, stat label, side badge, and line", async ({ page }) => {
    await page.goto("/edges?market_class=props")
    const shotsRow = page.getByRole("row").filter({ hasText: "Bukayo Saka" })
    await expect(shotsRow.getByText("Shots", { exact: true })).toBeVisible()
    await expect(shotsRow.getByText("OVER", { exact: true })).toBeVisible()
    await expect(shotsRow.getByText("2.5")).toBeVisible()

    // YES badge on the anytime-goalscorer row
    const goalscorerRow = page.getByRole("row").filter({ hasText: "Gabriel Jesus" })
    await expect(goalscorerRow.getByText("YES", { exact: true })).toBeVisible()
    await expect(goalscorerRow.getByText("Anytime goalscorer")).toBeVisible()
  })

  test("over/under prop detail shows player header, distribution chart, and over-probability chips", async ({
    page
  }) => {
    await page.goto(`/edges/${PROP_EDGE_OU_ID}`)
    const heading = page.getByRole("heading", { level: 1, name: /Bukayo Saka/ })
    await expect(heading).toBeVisible()
    await expect(heading.getByText("OVER")).toBeVisible()
    await expect(page.getByText("Shots ·")).toBeVisible()

    await expect(
      page.getByRole("heading", { name: "Player simulation distribution" })
    ).toBeVisible()
    const panel = page.locator("section", {
      has: page.getByRole("heading", { name: "Player simulation distribution" })
    })
    // the stat distribution renders to canvas
    await expect(panel.locator("canvas").first()).toBeVisible()
    // over-probability chips, with the prop line's chip present
    await expect(panel.getByText("Over 1.5 · 74.0%")).toBeVisible()
    await expect(panel.getByText("Over 2.5 · 50.0%")).toBeVisible()
    await expect(panel.getByText("Over 3.5 · 28.0%")).toBeVisible()
  })

  test("yes/no prop detail shows YES badge and yes-probability chip", async ({ page }) => {
    await page.goto(`/edges/${PROP_EDGE_YES_ID}`)
    const heading = page.getByRole("heading", { level: 1, name: /Gabriel Jesus/ })
    await expect(heading).toBeVisible()
    await expect(heading.getByText("YES")).toBeVisible()
    await expect(page.getByText("Anytime goalscorer ·")).toBeVisible()

    const panel = page.locator("section", {
      has: page.getByRole("heading", { name: "Player simulation distribution" })
    })
    await expect(panel.locator("canvas").first()).toBeVisible()
    await expect(panel.getByText("Yes 38.0%")).toBeVisible()
    await expect(panel.getByText("No 62.0%")).toBeVisible()
  })

  test("slate shows a prop count badge and prop chips on games with prop edges", async ({
    page
  }) => {
    await page.goto("/slate")
    await expect(page.getByText("Chelsea @ Arsenal")).toBeVisible()
    await expect(page.getByText("2 props")).toBeVisible()
    await expect(page.getByRole("link", { name: /Bukayo Saka Shots OVER 2\.5/ })).toBeVisible()
    await expect(
      page.getByRole("link", { name: /Gabriel Jesus Anytime goalscorer YES/ })
    ).toBeVisible()
  })
})
