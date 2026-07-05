/**
 * What the user is looking at, injected into chat requests (ADR-017):
 * an edge maps to EDGE_BREAKDOWN, a game to GAME_PREVIEW, the
 * performance page to PERFORMANCE_REVIEW.
 */

export type PageContext =
  | { type: "none" }
  | { type: "edge"; edgeId: string; label: string }
  | { type: "game"; gameId: string; label: string }
  | { type: "performance" }

class PageContextStore {
  current = $state<PageContext>({ type: "none" })

  set(context: PageContext): void {
    this.current = context
  }

  clear(): void {
    this.current = { type: "none" }
  }
}

export const pageContext = new PageContextStore()
