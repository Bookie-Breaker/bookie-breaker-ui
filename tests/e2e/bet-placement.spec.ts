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

    // the stub captured the placement: idempotency key forwarded verbatim.
    // /__placed-bets is append-only, so parallel projects cannot clobber it.
    const placed = (await (await request.get("http://localhost:9200/__placed-bets")).json()) as {
      idempotencyKey: string
      body: { side: string; edge_id: string | null; edge_percentage: number }
    }[]
    const homeBet = placed.find(
      (bet) => bet.body.edge_id === "11111111-1111-4111-8111-111111111111"
    )
    expect(homeBet).toBeTruthy()
    expect(homeBet?.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/)
    expect(homeBet?.body.side).toBe("HOME")
    expect(homeBet?.body.edge_percentage).toBeCloseTo(4.2)
  })

  test("derives DRAW from a three-way moneyline edge and offers it only there", async ({
    page,
    request
  }) => {
    await page.goto("/bets?edge=44444444-4444-4444-8444-444444444444")
    await expect(page.getByRole("heading", { name: "Bet this edge" })).toBeVisible()
    // selection "Draw" on a MONEYLINE edge auto-derives side DRAW (ADR-027)
    await expect(page.getByLabel("Selection")).toHaveValue("Draw")
    await expect(page.getByLabel("Side")).toHaveValue("DRAW")
    // manual override stays possible
    await page.getByLabel("Side").selectOption("AWAY")
    await page.getByLabel("Side").selectOption("DRAW")

    await page.getByRole("button", { name: "Place paper bet" }).click()
    await expect(page.getByText(/Bet placed:/)).toBeVisible()
    // /__placed-bets is append-only, so parallel projects cannot clobber it
    const placed = (await (await request.get("http://localhost:9200/__placed-bets")).json()) as {
      body: { side: string; market_type: string; selection: string }
    }[]
    const drawBet = placed.find((bet) => bet.body.side === "DRAW")
    expect(drawBet).toBeTruthy()
    expect(drawBet?.body.market_type).toBe("MONEYLINE")
    expect(drawBet?.body.selection).toBe("Draw")
  })

  test("does not offer DRAW off the moneyline", async ({ page }) => {
    await page.goto("/bets")
    await page.getByRole("button", { name: "Place a bet" }).click()
    // scope to the form: the ledger filters also carry a "Market" label
    const market = page.locator("form").getByLabel("Market")
    const side = page.locator("form").getByLabel("Side")
    // default market is SPREAD: HOME/AWAY only
    await expect(side.locator("option[value='DRAW']")).toHaveCount(0)
    await market.selectOption("MONEYLINE")
    await expect(side.locator("option[value='DRAW']")).toHaveCount(1)
    await market.selectOption("TOTAL")
    await expect(side.locator("option[value='DRAW']")).toHaveCount(0)
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
