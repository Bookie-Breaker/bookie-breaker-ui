/** Thin typed wrappers over the lines-service REST API (port 8001). */
import type {
  BestLine,
  Envelope,
  LineMovement,
  LineSnapshot,
  PageEnvelope,
  Sportsbook
} from "$lib/api/envelope"
import { serviceUrl } from "$lib/server/env"
import { upstream, type QueryParams } from "$lib/server/http"

const base = () => serviceUrl("LINES_SERVICE_URL")

export interface CurrentLinesFilters {
  league?: string
  game_id?: string
  sportsbook?: string
  market_type?: string
  date?: string
  limit?: number
  cursor?: string
}

export function getCurrentLines(
  fetchFn: typeof fetch,
  filters: CurrentLinesFilters = {}
): Promise<PageEnvelope<LineSnapshot>> {
  return upstream(base(), "/api/v1/lines/current", { fetchFn, query: filters as QueryParams })
}

export function getMovement(
  fetchFn: typeof fetch,
  gameId: string,
  query: { market_type?: string; sportsbook?: string; selection?: string } = {}
): Promise<Envelope<LineMovement[]>> {
  return upstream(base(), `/api/v1/lines/game/${encodeURIComponent(gameId)}/movement`, {
    fetchFn,
    query
  })
}

export function getBestLines(fetchFn: typeof fetch, gameId: string): Promise<Envelope<BestLine[]>> {
  return upstream(base(), `/api/v1/lines/game/${encodeURIComponent(gameId)}/best`, { fetchFn })
}

export function getSportsbooks(fetchFn: typeof fetch): Promise<Envelope<Sportsbook[]>> {
  return upstream(base(), "/api/v1/lines/sportsbooks", { fetchFn })
}
