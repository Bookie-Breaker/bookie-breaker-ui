/** Thin typed wrappers over the bookie-emulator REST API (port 8005). */
import type {
  BankrollData,
  BankrollHistoryData,
  BetData,
  BetDetailData,
  BreakdownData,
  CalibrationData,
  Envelope,
  PageEnvelope,
  ParlayDetailData,
  PerformanceData,
  PlaceBetRequest,
  PlaceParlayRequest
} from "$lib/api/envelope"
import { serviceUrl } from "$lib/server/env"
import { upstream, type QueryParams } from "$lib/server/http"

const base = () => serviceUrl("BOOKIE_EMULATOR_URL")

export interface BetFilters {
  league?: string
  market_type?: string
  result?: string
  status?: "open" | "graded" | "all"
  date_from?: string
  date_to?: string
  min_edge?: number
  limit?: number
  cursor?: string
}

export interface PerformanceFilters {
  league?: string
  market_type?: string
  date_from?: string
  date_to?: string
  window?: "daily" | "weekly" | "monthly" | "all_time"
}

export function placeBet(
  fetchFn: typeof fetch,
  body: PlaceBetRequest,
  idempotencyKey: string
): Promise<Envelope<BetData>> {
  return upstream(base(), "/api/v1/emulator/bets", {
    fetchFn,
    method: "POST",
    body,
    headers: { "X-Idempotency-Key": idempotencyKey }
  })
}

/** Place a parlay (2-6 team-market legs); replaying an idempotency key is safe. */
export function placeParlay(
  fetchFn: typeof fetch,
  body: PlaceParlayRequest,
  idempotencyKey: string
): Promise<Envelope<ParlayDetailData>> {
  return upstream(base(), "/api/v1/emulator/parlays", {
    fetchFn,
    method: "POST",
    body,
    headers: { "X-Idempotency-Key": idempotencyKey }
  })
}

/** A parlay parent with its legs, per-leg statuses, and grade when settled. */
export function getParlay(
  fetchFn: typeof fetch,
  betId: string
): Promise<Envelope<ParlayDetailData>> {
  return upstream(base(), `/api/v1/emulator/parlays/${encodeURIComponent(betId)}`, { fetchFn })
}

export function getBets(
  fetchFn: typeof fetch,
  filters: BetFilters = {}
): Promise<PageEnvelope<BetData>> {
  return upstream(base(), "/api/v1/emulator/bets", { fetchFn, query: filters as QueryParams })
}

export function getBet(fetchFn: typeof fetch, betId: string): Promise<Envelope<BetDetailData>> {
  return upstream(base(), `/api/v1/emulator/bets/${encodeURIComponent(betId)}`, { fetchFn })
}

export function getPerformance(
  fetchFn: typeof fetch,
  filters: PerformanceFilters = {}
): Promise<Envelope<PerformanceData>> {
  return upstream(base(), "/api/v1/emulator/performance", {
    fetchFn,
    query: filters as QueryParams
  })
}

export function getBreakdown(
  fetchFn: typeof fetch,
  groupBy: "league" | "market_type" | "sportsbook" | "month",
  query: { date_from?: string; date_to?: string } = {}
): Promise<Envelope<BreakdownData>> {
  return upstream(base(), "/api/v1/emulator/performance/breakdown", {
    fetchFn,
    query: { group_by: groupBy, ...query }
  })
}

export function getCalibration(
  fetchFn: typeof fetch,
  filters: PerformanceFilters & { bins?: number } = {}
): Promise<Envelope<CalibrationData>> {
  return upstream(base(), "/api/v1/emulator/performance/calibration", {
    fetchFn,
    query: filters as QueryParams
  })
}

export function getBankroll(fetchFn: typeof fetch): Promise<Envelope<BankrollData>> {
  return upstream(base(), "/api/v1/emulator/bankroll", { fetchFn })
}

export function getBankrollHistory(
  fetchFn: typeof fetch,
  query: { interval?: "per_bet" | "daily" | "weekly"; date_from?: string; date_to?: string } = {}
): Promise<Envelope<BankrollHistoryData>> {
  return upstream(base(), "/api/v1/emulator/bankroll/history", { fetchFn, query })
}
