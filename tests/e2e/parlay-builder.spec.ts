import { expect, test } from "@playwright/test"

test.describe("parlay builder", () => {
  test("builds, evaluates, and places a 2-leg same-game parlay", async ({ page, request }) => {
    await page.goto("/parlay")
    await expect(page.getByRole("heading", { name: "Parlay builder" })).toBeVisible()

    // pick both FIFA_WC legs from the detected-edges list
    await page.getByRole("button", { name: "Add France to parlay" }).click()
    await page.getByRole("button", { name: "Add Over 2.5 to parlay" }).click()
    await expect(page.getByText("Basket (2/6)")).toBeVisible()

    await page.getByRole("button", { name: "Evaluate" }).click()

    // correlation-aware evaluation: joint vs independent, ρ, price, EV
    await expect(page.getByTestId("joint-probability")).toHaveText("31.0%")
    await expect(page.getByTestId("independent-probability")).toHaveText("26.9%")
    await expect(page.getByTestId("correlation-edge")).toHaveText("+4.1%")
    await expect(page.getByTestId("correlation-edge")).toHaveClass(/text-success-500/)
    await expect(page.getByTestId("correlation-chips")).toContainText("ρ 0-1: 0.35")
    await expect(page.getByTestId("combined-odds")).toContainText("+264")
    await expect(page.getByTestId("combined-odds")).toContainText("3.64")
    await expect(page.getByTestId("ev-pct")).toHaveText("+6.10%")
    await expect(page.getByTestId("method-badge")).toHaveText("simulation_scaled")
    await expect(page.getByTestId("threshold-state")).toHaveText("Meets threshold")
    await expect(page.getByText("same game")).toBeVisible()
    await expect(page.getByLabel("Stake (units)")).toHaveValue("1.2")

    await page.getByRole("button", { name: "Place parlay" }).click()
    await expect(page.getByTestId("parlay-placed")).toContainText("Parlay placed")
    await expect(page.getByRole("link", { name: "view in ledger" })).toHaveAttribute(
      "href",
      "/bets/99999999-9999-4999-8999-999999999999"
    )

    // /__placed-parlays is append-only, so parallel projects cannot clobber it
    const placed = (await (await request.get("http://localhost:9200/__placed-parlays")).json()) as {
      idempotencyKey: string
      body: {
        legs: { game_id: string; side: string }[]
        stake: number
        predicted_probability: number
        edge_percentage: number
      }
    }[]
    expect(placed.length).toBeGreaterThan(0)
    for (const parlay of placed) {
      expect(parlay.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/)
      expect(parlay.body.legs).toHaveLength(2)
      expect(parlay.body.legs[0].game_id).toBe("88888888-8888-4888-8888-888888888888")
      expect(parlay.body.predicted_probability).toBeCloseTo(0.31)
      // edge vs the combined price: 0.31 - 1/3.64, in points
      expect(parlay.body.edge_percentage).toBeCloseTo(3.53, 1)
      expect(parlay.body.stake).toBeCloseTo(1.2)
    }
  })

  test("parlay parent renders in the ledger detail with its legs", async ({ page }) => {
    await page.goto("/bets/99999999-9999-4999-8999-999999999999")
    await expect(page.getByRole("heading", { name: /France \+ Over 2\.5/ })).toBeVisible()
    await expect(page.getByText("PARLAY", { exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Legs" })).toBeVisible()
    await expect(page.getByRole("cell", { name: "France", exact: true })).toBeVisible()
    await expect(page.getByRole("cell", { name: "Over 2.5", exact: true })).toBeVisible()
  })

  test("mirrors the same-league rule client-side", async ({ page }) => {
    await page.goto("/parlay")
    await page.getByRole("button", { name: "Add France to parlay" }).click()
    await page.getByRole("button", { name: "Add LAL -3.5 to parlay" }).click()
    await expect(page.getByRole("alert")).toContainText(
      "All legs must be in the same league — this parlay is FIFA_WC."
    )
    // the mismatched leg was rejected; the basket still holds one leg
    await expect(page.getByText("Basket (1/6)")).toBeVisible()
  })

  test("evaluate stays disabled until the basket has two legs", async ({ page }) => {
    await page.goto("/parlay")
    await expect(page.getByRole("button", { name: "Evaluate" })).toBeDisabled()
    await page.getByRole("button", { name: "Add France to parlay" }).click()
    await expect(page.getByRole("button", { name: "Evaluate" })).toBeDisabled()
    await expect(page.getByText("Needs at least 2 legs.")).toBeVisible()
    await page.getByRole("button", { name: "Add Over 2.5 to parlay" }).click()
    await expect(page.getByRole("button", { name: "Evaluate" })).toBeEnabled()
  })
})
