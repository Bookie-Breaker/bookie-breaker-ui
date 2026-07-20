import { describe, expect, it } from "vitest"

import {
  STAT_LABELS,
  isPlayerProp,
  parsePropSelection,
  playerSlug,
  propView,
  statLabel,
  titleCaseSlug
} from "$lib/utils/props"

describe("statLabel", () => {
  it("maps every canonical stat key the prop pipeline ingests", () => {
    expect(statLabel("player_shots")).toBe("Shots")
    expect(statLabel("player_shots_on_target")).toBe("Shots on target")
    expect(statLabel("player_goal_scorer_anytime")).toBe("Anytime goalscorer")
    expect(statLabel("batter_hits")).toBe("Hits")
    expect(statLabel("batter_total_bases")).toBe("Total bases")
    expect(statLabel("batter_home_runs")).toBe("Home runs")
    expect(statLabel("pitcher_strikeouts")).toBe("Strikeouts")
    expect(statLabel("player_points")).toBe("Points")
    expect(statLabel("player_rebounds")).toBe("Rebounds")
    expect(statLabel("player_assists")).toBe("Assists")
    expect(statLabel("player_threes")).toBe("Threes")
    expect(statLabel("player_points_rebounds_assists")).toBe("Points + rebounds + assists")
    expect(statLabel("player_pass_yds")).toBe("Passing yards")
    expect(statLabel("player_rush_yds")).toBe("Rushing yards")
    expect(statLabel("player_reception_yds")).toBe("Receiving yards")
    expect(statLabel("player_receptions")).toBe("Receptions")
    expect(statLabel("player_anytime_td")).toBe("Anytime TD")
  })

  it("covers every key in the map (no orphan entries)", () => {
    for (const key of Object.keys(STAT_LABELS)) {
      expect(statLabel(key)).toBe(STAT_LABELS[key])
    }
  })

  it("sentence-cases unknown keys after stripping the prop prefix", () => {
    expect(statLabel("player_first_td")).toBe("First td")
    expect(statLabel("batter_stolen_bases")).toBe("Stolen bases")
    expect(statLabel("weird_key")).toBe("Weird key")
  })

  it("returns null for missing input", () => {
    expect(statLabel(null)).toBeNull()
    expect(statLabel(undefined)).toBeNull()
    expect(statLabel("")).toBeNull()
  })
})

describe("titleCaseSlug", () => {
  it("title-cases an ADR-029 name slug", () => {
    expect(titleCaseSlug("kylian-mbappe")).toBe("Kylian Mbappe")
    expect(titleCaseSlug("bukayo-saka")).toBe("Bukayo Saka")
  })
})

describe("playerSlug", () => {
  it("folds diacritics and hyphenates like the backend slug", () => {
    expect(playerSlug("Kylian Mbappé")).toBe("kylian-mbappe")
    expect(playerSlug("Bukayo Saka")).toBe("bukayo-saka")
    expect(playerSlug("N'Golo Kanté")).toBe("n-golo-kante")
  })
})

describe("parsePropSelection", () => {
  it("parses an over/under selection into player, side, and line", () => {
    expect(parsePropSelection("Bukayo Saka Over 2.5")).toEqual({
      player: "Bukayo Saka",
      side: "OVER",
      line: 2.5,
      statKey: null
    })
    expect(parsePropSelection("Erling Haaland Under 1.5", "player_shots_on_target")).toEqual({
      player: "Erling Haaland",
      side: "UNDER",
      line: 1.5,
      statKey: "player_shots_on_target"
    })
  })

  it("parses a yes/no selection, stripping the known label", () => {
    expect(parsePropSelection("Gabriel Jesus Anytime Goalscorer Yes")).toEqual({
      player: "Gabriel Jesus",
      side: "YES",
      line: null,
      statKey: "player_goal_scorer_anytime"
    })
    expect(parsePropSelection("Travis Kelce Anytime TD No")).toEqual({
      player: "Travis Kelce",
      side: "NO",
      line: null,
      statKey: "player_anytime_td"
    })
  })

  it("strips an unknown yes/no label via the humanized stat_type", () => {
    expect(parsePropSelection("Some Player First td Yes", "player_first_td")).toEqual({
      player: "Some Player",
      side: "YES",
      line: null,
      statKey: "player_first_td"
    })
  })

  it("keeps the full prefix when no yes/no label matches", () => {
    const parsed = parsePropSelection("Jane Doe Hat Trick Yes")
    expect(parsed.side).toBe("YES")
    expect(parsed.player).toBe("Jane Doe Hat Trick")
  })

  it("returns nulls for selections that are not prop-shaped", () => {
    expect(parsePropSelection("LAL -3.5").side).toBeNull()
    expect(parsePropSelection("Draw").player).toBeNull()
  })
})

describe("isPlayerProp", () => {
  it("selects on market_type", () => {
    expect(isPlayerProp({ market_type: "PLAYER_PROP" })).toBe(true)
    expect(isPlayerProp({ market_type: "SPREAD" })).toBe(false)
    expect(isPlayerProp({ market_type: "TEAM_PROP" })).toBe(false)
  })
})

describe("propView", () => {
  it("prefers structured fields and derives labels from stat_type", () => {
    const view = propView({
      selection: "Bukayo Saka Over 2.5",
      player_external_id: "bukayo-saka",
      stat_type: "player_shots",
      prop_type: "OVER_UNDER"
    })
    expect(view).toEqual({
      player: "Bukayo Saka",
      side: "OVER",
      line: 2.5,
      statKey: "player_shots",
      statLabel: "Shots",
      slug: "bukayo-saka"
    })
  })

  it("recovers everything from the selection when structured fields are absent", () => {
    const view = propView({ selection: "Gabriel Jesus Anytime Goalscorer Yes" })
    expect(view.player).toBe("Gabriel Jesus")
    expect(view.side).toBe("YES")
    expect(view.statKey).toBe("player_goal_scorer_anytime")
    expect(view.statLabel).toBe("Anytime goalscorer")
    expect(view.slug).toBe("gabriel-jesus")
  })

  it("title-cases the slug when the selection does not parse", () => {
    const view = propView({
      selection: "???",
      player_external_id: "kylian-mbappe",
      stat_type: "player_shots"
    })
    expect(view.player).toBe("Kylian Mbappe")
    expect(view.slug).toBe("kylian-mbappe")
    expect(view.statLabel).toBe("Shots")
  })
})
