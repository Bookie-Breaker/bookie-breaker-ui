/**
 * Player-prop display helpers (Phase 7 Wave 3, ADR-029).
 *
 * The agent stores structured prop identity (player_external_id name slug,
 * stat_type, prop_type) on edges, but the regenerated agent OpenAPI spec has
 * not landed the fields on EdgeListItem/EdgeDetailData yet — PropEdgeFields
 * types them at runtime (same pattern as MaybeLiveEdge in utils/live.ts) and
 * every helper falls back to parsing the selection string, which lines-service
 * builds as "{Player} Over|Under {line}" / "{Player} {label} Yes|No".
 */

export const PLAYER_PROP_MARKET = "PLAYER_PROP"

export type PropSide = "OVER" | "UNDER" | "YES" | "NO"

/** Structured prop identity riding on edge payloads ahead of the spec regen. */
export interface PropEdgeFields {
  player_external_id?: string | null
  stat_type?: string | null
  prop_type?: "OVER_UNDER" | "YES_NO" | null
}

/** True for player-prop edges regardless of payload vintage. */
export function isPlayerProp(edge: { market_type: string }): boolean {
  return edge.market_type === PLAYER_PROP_MARKET
}

/**
 * Canonical Odds API stat keys (ADR-029) to display labels. Covers every key
 * the lines-service prop allow-list ingests (soccer/MLB live, NBA/NFL dormant).
 */
export const STAT_LABELS: Record<string, string> = {
  // soccer
  player_shots: "Shots",
  player_shots_on_target: "Shots on target",
  player_goal_scorer_anytime: "Anytime goalscorer",
  // baseball
  batter_hits: "Hits",
  batter_total_bases: "Total bases",
  batter_home_runs: "Home runs",
  pitcher_strikeouts: "Strikeouts",
  // basketball
  player_points: "Points",
  player_rebounds: "Rebounds",
  player_assists: "Assists",
  player_threes: "Threes",
  player_points_rebounds_assists: "Points + rebounds + assists",
  // football
  player_pass_yds: "Passing yards",
  player_rush_yds: "Rushing yards",
  player_reception_yds: "Receiving yards",
  player_receptions: "Receptions",
  player_anytime_td: "Anytime TD"
}

/**
 * Yes/No selection labels lines-service embeds in selections
 * ("{Player} Anytime Goalscorer Yes"), lowercased, mapped back to stat keys.
 */
const YES_NO_SELECTION_LABELS: Record<string, string> = {
  "anytime goalscorer": "player_goal_scorer_anytime",
  "anytime td": "player_anytime_td"
}

const STAT_KEY_PREFIXES = ["player_", "batter_", "pitcher_", "team_"]

/** "player_shots_on_target" -> "Shots on target" (map hit or sentence-cased fallback). */
export function statLabel(statType: string | null | undefined): string | null {
  if (!statType) return null
  const known = STAT_LABELS[statType]
  if (known) return known
  let key = statType
  for (const prefix of STAT_KEY_PREFIXES) {
    if (key.startsWith(prefix)) {
      key = key.slice(prefix.length)
      break
    }
  }
  const words = key.split("_").filter(Boolean).join(" ")
  if (!words) return null
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** "kylian-mbappe" -> "Kylian Mbappe" (display fallback for a name slug). */
export function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * ADR-029 name slug: lowercase, NFKD diacritic-folded to ASCII,
 * hyphen-separated ("Kylian Mbappé" -> "kylian-mbappe"). Must stay in
 * lockstep with lines-service/agent — it is the cross-system prop identity.
 */
export function playerSlug(name: string): string {
  // NFKD splits diacritics into combining marks; dropping them matches the
  // Python encode("ascii", "ignore") the backends use for the same slug.
  const ascii = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  return ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export interface ParsedPropSelection {
  /** The player's display name, or null when the selection doesn't parse. */
  player: string | null
  side: PropSide | null
  line: number | null
  /** Stat key recovered from a Yes/No selection label, when recognizable. */
  statKey: string | null
}

/**
 * Parse a prop selection string. Over/Under selections are
 * "{Player} Over|Under {line}"; Yes/No selections are "{Player} {label} Yes|No"
 * (label stripped via the known labels or the humanized stat_type when given).
 */
export function parsePropSelection(
  selection: string,
  statType?: string | null
): ParsedPropSelection {
  const tokens = selection.trim().split(/\s+/)
  const none: ParsedPropSelection = { player: null, side: null, line: null, statKey: null }
  if (tokens.length < 2) return none

  const last = tokens[tokens.length - 1].toLowerCase()
  if (last === "yes" || last === "no") {
    const side: PropSide = last === "yes" ? "YES" : "NO"
    const rest = tokens.slice(0, -1).join(" ")
    const restLower = rest.toLowerCase()
    const candidates: { label: string; statKey: string | null }[] = Object.entries(
      YES_NO_SELECTION_LABELS
    ).map(([label, key]) => ({ label, statKey: key }))
    const humanized = statLabel(statType)
    if (humanized) candidates.push({ label: humanized.toLowerCase(), statKey: statType ?? null })
    for (const { label, statKey } of candidates) {
      if (restLower.endsWith(` ${label}`)) {
        return {
          player: rest.slice(0, rest.length - label.length - 1).trim(),
          side,
          line: null,
          statKey: statType ?? statKey
        }
      }
    }
    return { player: rest.trim() || null, side, line: null, statKey: statType ?? null }
  }

  const sideIndex = tokens.findIndex((token, index) => index > 0 && /^(over|under)$/i.test(token))
  if (sideIndex > 0) {
    const lineToken = tokens[sideIndex + 1]
    const line = lineToken !== undefined ? Number(lineToken) : NaN
    return {
      player: tokens.slice(0, sideIndex).join(" "),
      side: tokens[sideIndex].toLowerCase() === "over" ? "OVER" : "UNDER",
      line: Number.isFinite(line) ? line : null,
      statKey: statType ?? null
    }
  }
  return { ...none, statKey: statType ?? null }
}

export interface PropView {
  player: string
  side: PropSide | null
  line: number | null
  statKey: string | null
  statLabel: string | null
  /** ADR-029 name slug for joining to player distributions. */
  slug: string | null
}

/**
 * Everything the prop UI needs from one edge: structured fields when the
 * payload carries them, selection parsing otherwise, slug title-casing as the
 * last-resort display name.
 */
export function propView(edge: { selection: string } & PropEdgeFields): PropView {
  const parsed = parsePropSelection(edge.selection, edge.stat_type)
  const player =
    parsed.player ??
    (edge.player_external_id ? titleCaseSlug(edge.player_external_id) : edge.selection)
  const statKey = edge.stat_type ?? parsed.statKey
  const slug = edge.player_external_id ?? (parsed.player ? playerSlug(parsed.player) : null)
  return {
    player,
    side: parsed.side,
    line: parsed.line,
    statKey,
    statLabel: statLabel(statKey),
    slug
  }
}
