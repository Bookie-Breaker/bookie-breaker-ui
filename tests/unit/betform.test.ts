/**
 * BetForm server-rendered in its three entry modes: manual, edge-prefilled,
 * and live. Submission runs client-side and is covered by the /api/bets
 * proxy tests plus the bet-placement e2e.
 */
import { render } from "svelte/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("$app/navigation", () => ({ invalidate: vi.fn() }))

import BetForm from "$lib/components/bets/BetForm.svelte"
import { edgeDetail } from "../helpers/fixtures"

describe("BetForm manual mode", () => {
  it("renders the free-entry fields with model inputs", () => {
    const { body } = render(BetForm, { props: {} })
    expect(body).toContain("Game ID")
    expect(body).toContain("Predicted probability")
    expect(body).toContain("Edge (% points)")
    expect(body).toContain("Place paper bet")
    expect(body).not.toContain("Betting edge")
  })

  it("offers only the sides valid for the default SPREAD market", () => {
    const { body } = render(BetForm, { props: {} })
    expect(body).toContain(">HOME</option>")
    expect(body).toContain(">AWAY</option>")
    expect(body).not.toContain(">OVER</option>")
    expect(body).not.toContain(">DRAW</option>")
  })
})

describe("BetForm edge mode", () => {
  it("locks the market/selection to the edge and derives the side", () => {
    const { body } = render(BetForm, { props: { edge: edgeDetail() } })
    expect(body).toContain("Betting edge")
    expect(body).toContain("LAL -3.5")
    expect(body).toContain("draftkings")
    expect(body).toContain("-110")
    expect(body).toContain("disabled")
    // Derived HOME side arrives pre-selected; manual model inputs disappear.
    expect(body).toContain('<option value="HOME" selected')
    expect(body).not.toContain("Predicted probability")
    expect(body).not.toContain("Game ID")
  })

  it("prefills the stake from the recommended stake", () => {
    const { body } = render(BetForm, { props: { edge: edgeDetail({ recommended_stake: 2.4 }) } })
    expect(body).toContain('value="2.4"')
  })

  it("leaves the side unselected when it cannot be derived", () => {
    const edge = edgeDetail({ market_type: "MONEYLINE", selection: "Someone Else" })
    const { body } = render(BetForm, { props: { edge } })
    expect(body).toContain('<option value="" disabled')
    expect(body).not.toContain('<option value="HOME" selected')
  })
})

describe("BetForm live mode", () => {
  it("shows the live-bet notice and flags the placement", () => {
    const { body } = render(BetForm, { props: { edge: edgeDetail(), live: true } })
    expect(body).toContain('data-testid="live-bet-notice"')
    expect(body).toContain("In-game bet")
  })

  it("omits the notice for pregame placements", () => {
    const { body } = render(BetForm, { props: { edge: edgeDetail() } })
    expect(body).not.toContain("live-bet-notice")
  })
})
