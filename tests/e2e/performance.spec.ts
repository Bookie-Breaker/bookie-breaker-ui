import { expect, test } from "@playwright/test"

test.describe("performance viewing", () => {
  test("shows summary stats and all four chart panels", async ({ page }) => {
    await page.goto("/performance")
    await expect(page.getByRole("heading", { name: "Paper trading performance" })).toBeVisible()
    await expect(page.getByText("6.2%")).toBeVisible() // ROI
    await expect(page.getByText("streaks W6/L4")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Bankroll & ROI over time" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Win rate & CLV over time" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Calibration", exact: true })).toBeVisible()
    await expect(page.getByText("134 settled bets")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Breakdown" })).toBeVisible()
    // all chart panels rendered canvases
    expect(await page.locator("canvas").count()).toBeGreaterThanOrEqual(4)
  })

  test("bet ledger lists placed bets after a placement", async ({ page, request }) => {
    // ensure the stub has a bet recorded (idempotent for reruns)
    await request.post("http://localhost:9200/api/v1/emulator/bets", {
      headers: { "X-Idempotency-Key": "seed-key" },
      data: { game_id: "g", selection: "LAL -3.5", side: "HOME", stake: 1.5 }
    })
    await page.goto("/bets")
    await expect(page.getByRole("heading", { name: "Bet ledger" })).toBeVisible()
    await expect(page.getByRole("link", { name: "LAL -3.5" })).toBeVisible()
    await expect(page.locator("tbody").getByText("PENDING")).toBeVisible()
  })
})
