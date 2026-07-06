/**
 * Best-odds bookkeeping for the lines page. Odds are only comparable within
 * one outcome of one market — grouping per (market_type, selection) keeps the
 * highlight correct for two-way markets and three-way moneylines alike, where
 * the long-odds Draw outcome would otherwise always win a per-game comparison.
 */

interface SelectionSnapshot {
  market_type: string
  selection: string
  odds_american: number
}

export function selectionKey(
  snapshot: Pick<SelectionSnapshot, "market_type" | "selection">
): string {
  return `${snapshot.market_type}|${snapshot.selection}`
}

export function bestOddsBySelection(snapshots: SelectionSnapshot[]): Map<string, number> {
  const best = new Map<string, number>()
  for (const snapshot of snapshots) {
    const key = selectionKey(snapshot)
    const current = best.get(key)
    if (current === undefined || snapshot.odds_american > current) {
      best.set(key, snapshot.odds_american)
    }
  }
  return best
}
