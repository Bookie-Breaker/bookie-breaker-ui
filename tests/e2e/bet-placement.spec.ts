import { expect, test } from "@playwright/test"

test.describe("bet placement", () => {
  test("prefills from an edge and places with an idempotency key", async ({ page, request }) => {
    await page.goto("/bets?edge=11111111-1111-4111-8111-111111111111")
    await expect(page.getByRole("heading", { name: "Bet this edge" })).toBeVisible()
    // prefilled from the edge, side derived from the selection
    await expect(page.getByLabel("Selection")).toHaveValue("LAL -3.5")
    await expect(page.getByLabel("Side")).toHaveValue("HOME")
    await expect(page.getByLabel("Stake (units)")).toHaveValue("1.5")

    await page.getByRole("button", { name: "Place paper bet" }).click()
    await expect(page.getByText(/Bet placed: LAL -3\.5/)).toBeVisible()

    // the stub captured the placement: idempotency key forwarded verbatim
    const lastBet = await (await request.get("http://localhost:9200/__last-bet")).json()
    expect(lastBet.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/)
    expect(lastBet.body.side).toBe("HOME")
    expect(lastBet.body.edge_id).toBe("11111111-1111-4111-8111-111111111111")
    expect(lastBet.body.edge_percentage).toBeCloseTo(4.2)
  })

  test("manual form requires a side before submitting", async ({ page }) => {
    await page.goto("/bets")
    await page.getByRole("button", { name: "Place a bet" }).click()
    await page.getByLabel("Game ID").fill("22222222-2222-4222-8222-222222222222")
    await page.getByLabel("Selection").fill("Over 224.5")
    await page.getByLabel("Stake (units)").fill("1")
    await page.getByRole("button", { name: "Place paper bet" }).click()
    // side select is required; the form must not submit successfully
    await expect(page.getByText(/Bet placed:/)).not.toBeVisible()
  })
})
