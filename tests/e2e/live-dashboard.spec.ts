import { expect, test } from "@playwright/test"

const LIVE_EDGE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

test.describe("live dashboard", () => {
  test("renders live lines grouped by game and the live edges panel", async ({ page }) => {
    await page.goto("/live")
    await expect(page.getByRole("heading", { name: "Live", exact: true })).toBeVisible()

    // live edges panel: matchup, EV, edge badge, ticking countdown chip
    await expect(page.getByRole("heading", { name: "Live edges" })).toBeVisible()
    await expect(page.getByRole("link", { name: "ENG @ ARG" })).toBeVisible()
    await expect(page.getByText("+3.80%")).toBeVisible()
    await expect(page.getByTestId("edge-countdown")).toHaveText(/^(\d+m \d{2}s|\d+s)$/)
    await expect(page.getByRole("link", { name: "Bet live Argentina" })).toBeVisible()

    // live lines grouped under one LIVE game card, best price highlighted
    await expect(page.getByRole("heading", { name: "Live lines" })).toBeVisible()
    const gameCard = page
      .locator("div.card")
      .filter({ hasText: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" })
    await expect(gameCard.getByText("LIVE", { exact: true })).toBeVisible()
    await expect(gameCard.getByRole("cell", { name: "draftkings" })).toHaveCount(4)
    await expect(gameCard.getByRole("cell", { name: "fanduel" })).toHaveCount(2)
    // -105 draftkings beats -110 fanduel for the Argentina moneyline
    await expect(gameCard.getByRole("cell", { name: "-105" })).toHaveClass(/text-success-500/)
  })

  test("nav exposes the Live entry with its indicator dot", async ({ page }) => {
    await page.goto("/")
    const liveLink = page.getByRole("navigation", { name: "Primary" }).getByRole("link", {
      name: "Live"
    })
    await expect(liveLink).toHaveAttribute("href", "/live")
    await liveLink.click()
    await expect(page).toHaveURL(/\/live$/)
    await expect(liveLink).toHaveAttribute("aria-current", "page")
  })

  test("bet live prefills the form and forwards is_live to the emulator", async ({
    page,
    request
  }) => {
    await page.goto("/live")
    await page.getByRole("link", { name: "Bet live Argentina" }).click()
    await expect(page).toHaveURL(new RegExp(`/bets\\?edge=${LIVE_EDGE_ID}&live=1`))

    await expect(page.getByRole("heading", { name: "Bet this edge" })).toBeVisible()
    await expect(page.getByTestId("live-bet-notice")).toContainText("In-game bet")
    await expect(page.getByLabel("Selection")).toHaveValue("Argentina")
    await expect(page.getByLabel("Side")).toHaveValue("HOME")
    // live edges carry recommended_stake 0 — the bettor sizes the bet
    await page.getByLabel("Stake (units)").fill("1")
    await page.getByRole("button", { name: "Place paper bet" }).click()
    await expect(page.getByText(/Bet placed:/)).toBeVisible()

    // /__placed-bets is append-only, so parallel projects cannot clobber it
    const placed = (await (await request.get("http://localhost:9200/__placed-bets")).json()) as {
      idempotencyKey: string
      body: { edge_id: string | null; is_live?: boolean; side: string }
    }[]
    const liveBet = placed.find((bet) => bet.body.edge_id === LIVE_EDGE_ID)
    expect(liveBet).toBeTruthy()
    expect(liveBet?.body.is_live).toBe(true)
    expect(liveBet?.body.side).toBe("HOME")
    expect(liveBet?.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/)
  })

  test("pregame placements stay is_live: false", async ({ page, request }) => {
    await page.goto("/bets?edge=11111111-1111-4111-8111-111111111111")
    await expect(page.getByRole("heading", { name: "Bet this edge" })).toBeVisible()
    await expect(page.getByTestId("live-bet-notice")).not.toBeVisible()
    await page.getByRole("button", { name: "Place paper bet" }).click()
    await expect(page.getByText(/Bet placed:/)).toBeVisible()

    const placed = (await (await request.get("http://localhost:9200/__placed-bets")).json()) as {
      body: { edge_id: string | null; is_live?: boolean }
    }[]
    const pregame = placed.find(
      (bet) => bet.body.edge_id === "11111111-1111-4111-8111-111111111111"
    )
    expect(pregame).toBeTruthy()
    expect(pregame?.body.is_live).toBe(false)
  })

  test("ledger filters live bets and badges them", async ({ page }) => {
    await page.goto("/bets")
    const liveRow = page.getByRole("row", { name: /Argentina/ })
    await expect(liveRow.getByText("LIVE", { exact: true })).toBeVisible()

    // Live only: the canned live bet stays
    await page.getByLabel("Live").selectOption("true")
    await expect(page).toHaveURL(/is_live=true/)
    await expect(page.getByRole("link", { name: "Argentina", exact: true })).toBeVisible()

    // Pregame only: the live bet disappears
    await page.getByLabel("Live").selectOption("false")
    await expect(page).toHaveURL(/is_live=false/)
    await expect(page.getByRole("link", { name: "Argentina", exact: true })).not.toBeVisible()
  })
})
