/**
 * Slate and Parlay builder routes server-rendered.
 */
import { render } from "svelte/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("$app/navigation", () => ({ goto: vi.fn(), invalidate: vi.fn() }))

import ParlayPage from "../../src/routes/parlay/+page.svelte"
import SlatePage from "../../src/routes/slate/+page.svelte"
import { slateData } from "../helpers/fixtures"

describe("slate page", () => {
  it("shows the empty state when no games are scheduled", () => {
    const { body } = render(SlatePage, {
      props: { data: { slate: slateData({ games: [] }) } } as never
    })
    expect(body).toContain("No games today")
  })

  it("renders game cards with predictions and edge chips", () => {
    const { body } = render(SlatePage, { props: { data: { slate: slateData() } } as never })
    expect(body).toContain("Boston Celtics @ Los Angeles Lakers")
    expect(body).toContain("NBA")
    expect(body).toContain("LAL\n") // prediction badge selection
    expect(body).toContain("58.0%")
    expect(body).toContain("SPREAD")
    expect(body).toContain("+4.0% @ draftkings")
    expect(body).toContain('href="/edges/11111111-1111-4111-8111-111111111111"')
  })

  it("splits prop edges into labeled chips with a count badge", () => {
    const slate = slateData()
    slate.games[0].edges.push({
      id: "e-prop",
      market_type: "PLAYER_PROP",
      selection: "Bukayo Saka Over 2.5",
      edge_percentage: 6.1,
      sportsbook_key: "draftkings",
      has_paper_bet: false,
      stat_type: "player_shots",
      prop_type: "OVER_UNDER"
    } as never)
    const { body } = render(SlatePage, { props: { data: { slate } } as never })
    expect(body).toContain("1\n") // "1 prop" count badge
    expect(body).toContain("prop")
    expect(body).toContain("Bukayo Saka Shots OVER 2.5")
  })

  it("notes games without edges", () => {
    const slate = slateData()
    slate.games[0].edges = []
    slate.games[0].prediction = null
    const { body } = render(SlatePage, { props: { data: { slate } } as never })
    expect(body).toContain("No edges detected")
  })
})

describe("parlay page", () => {
  const edgeLeg = {
    leg: {
      game_external_id: "odds-game-1",
      market_type: "SPREAD",
      side: "HOME",
      selection: "LAL -3.5",
      line_value: -3.5,
      sportsbook_key: "draftkings",
      league: "NBA",
      edge_id: "e-1"
    },
    edge_percentage: 4.0,
    odds_american: -110,
    matchup: "BOS @ LAL",
    scheduled_start: "2026-07-21T00:00:00Z"
  }

  it("explains the flow and shows the empty basket without edges", () => {
    const { body } = render(ParlayPage, { props: { data: { edgeLegs: [] } } as never })
    expect(body).toContain("Parlay builder")
    expect(body).toContain("No fresh team-market edges")
    expect(body).toContain("Add 2–6 legs from one league")
    expect(body).toContain("Manual leg")
    expect(body).toContain("Evaluate")
  })

  it("lists pickable edge legs with matchup context and add buttons", () => {
    const { body } = render(ParlayPage, { props: { data: { edgeLegs: [edgeLeg] } } as never })
    expect(body).toContain("LAL -3.5")
    expect(body).toContain("NBA · BOS @ LAL")
    expect(body).toContain("SPREAD HOME")
    expect(body).toContain("+4.00%")
    expect(body).toContain(">Add</button>") // add-to-basket button
    expect(body).toContain("(0/6)") // basket starts empty
  })

  it("offers only spread sides for the default manual market", () => {
    const { body } = render(ParlayPage, { props: { data: { edgeLegs: [] } } as never })
    expect(body).toContain(">HOME</option>")
    expect(body).toContain(">AWAY</option>")
    expect(body).not.toContain(">DRAW</option>")
  })
})
