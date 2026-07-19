/**
 * Pure helpers for the live dashboard (Phase 7 Wave 2, ADR-031).
 *
 * Live edges: the agent persists is_live edges and returns them from the
 * edges list API, but the regenerated agent OpenAPI spec has not landed
 * is_live on EdgeListItem yet — MaybeLiveEdge types the runtime field and
 * filterLiveEdges selects on it client-side. Drop both once the agent spec
 * regen ships and `pnpm gen:api` adds the field.
 */
import type { EdgeListItem, LineSnapshot } from "$lib/api/envelope"

export type MaybeLiveEdge = EdgeListItem & { is_live?: boolean }

/** Edges flagged live at runtime; absent/false flags are pregame edges. */
export function filterLiveEdges(edges: EdgeListItem[]): MaybeLiveEdge[] {
  return (edges as MaybeLiveEdge[]).filter((edge) => edge.is_live === true)
}

export interface LiveGameGroup {
  gameId: string
  snapshots: LineSnapshot[]
}

/**
 * Group snapshots per game (first-seen order) with a stable in-group sort
 * by (market, selection, book) so SSE-driven refetches don't shuffle rows.
 */
export function groupLinesByGame(snapshots: LineSnapshot[]): LiveGameGroup[] {
  const grouped = new Map<string, LineSnapshot[]>()
  for (const snapshot of snapshots) {
    const list = grouped.get(snapshot.game_id) ?? []
    list.push(snapshot)
    grouped.set(snapshot.game_id, list)
  }
  return [...grouped.entries()].map(([gameId, group]) => ({
    gameId,
    snapshots: [...group].sort(
      (a, b) =>
        a.market_type.localeCompare(b.market_type) ||
        a.selection.localeCompare(b.selection) ||
        a.sportsbook_key.localeCompare(b.sportsbook_key)
    )
  }))
}

/** Short-expiry countdown for live-edge chips: "1h 04m", "3m 12s", "42s". */
export function formatCountdown(expiresAt: string, nowMs: number): string {
  const remaining = Date.parse(expiresAt) - nowMs
  if (!Number.isFinite(remaining)) return "—"
  if (remaining <= 0) return "expired"
  const totalSeconds = Math.floor(remaining / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`
  }
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`
  return `${seconds}s`
}

/** True when an event payload carries the is_live flag (routing only — never rendered). */
export function isLiveFlagged(payload: unknown): boolean {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as { is_live?: unknown }).is_live === true
  )
}

/**
 * Invalidation targets for one event: the static per-event mapping, plus
 * app:live when a lines.updated / edge.detected payload is flagged is_live.
 * Consulting the flag is payload-derived *routing* (same category as the
 * event-name routing itself) — payload contents are still never rendered.
 */
export function liveInvalidationTargets(
  event: string,
  payload: unknown,
  base: Record<string, string[]>
): string[] {
  const targets = [...(base[event] ?? [])]
  if ((event === "lines.updated" || event === "edge.detected") && isLiveFlagged(payload)) {
    targets.push("app:live")
  }
  return targets
}
