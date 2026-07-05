/** Thin typed wrappers over the agent REST API (port 8006). */
import type {
  AlertData,
  AnalysisRequest,
  DashboardData,
  EdgeDetail,
  EdgeListItem,
  Envelope,
  PageEnvelope,
  PipelineRunAccepted,
  PipelineRunData,
  SlateData
} from "$lib/api/envelope"
import { serviceUrl } from "$lib/server/env"
import { upstream, type QueryParams } from "$lib/server/http"

const base = () => serviceUrl("AGENT_URL")

export interface EdgeFilters {
  league?: string
  date?: string
  min_edge?: number
  market_type?: string
  is_stale?: boolean
  limit?: number
  cursor?: string
}

export function getEdges(
  fetchFn: typeof fetch,
  filters: EdgeFilters = {}
): Promise<PageEnvelope<EdgeListItem>> {
  return upstream(base(), "/api/v1/agent/edges", { fetchFn, query: filters as QueryParams })
}

export function getEdgeDetail(
  fetchFn: typeof fetch,
  edgeId: string
): Promise<Envelope<EdgeDetail>> {
  return upstream(base(), `/api/v1/agent/edges/${encodeURIComponent(edgeId)}`, { fetchFn })
}

export function getSlate(
  fetchFn: typeof fetch,
  query: { league?: string; date?: string } = {}
): Promise<Envelope<SlateData>> {
  return upstream(base(), "/api/v1/agent/slate", { fetchFn, query })
}

export function getDashboard(
  fetchFn: typeof fetch,
  league?: string
): Promise<Envelope<DashboardData>> {
  return upstream(base(), "/api/v1/agent/dashboard", { fetchFn, query: { league } })
}

export function getAlerts(
  fetchFn: typeof fetch,
  query: { acknowledged?: boolean; limit?: number; cursor?: string } = {}
): Promise<PageEnvelope<AlertData>> {
  return upstream(base(), "/api/v1/agent/alerts", { fetchFn, query })
}

export function acknowledgeAlert(
  fetchFn: typeof fetch,
  alertId: string
): Promise<Envelope<AlertData>> {
  return upstream(base(), `/api/v1/agent/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
    fetchFn,
    method: "PUT"
  })
}

export function runPipeline(
  fetchFn: typeof fetch,
  league: string
): Promise<Envelope<PipelineRunAccepted>> {
  return upstream(base(), "/api/v1/agent/pipeline/run", {
    fetchFn,
    method: "POST",
    body: { league }
  })
}

export function getPipelineRun(
  fetchFn: typeof fetch,
  runId: string
): Promise<Envelope<PipelineRunData>> {
  return upstream(base(), `/api/v1/agent/pipeline/runs/${encodeURIComponent(runId)}`, { fetchFn })
}

/**
 * Proxy a streaming analysis request, returning the raw upstream response
 * (SSE body piped through, or a JSON envelope from older agents).
 */
export function streamAnalysis(fetchFn: typeof fetch, body: AnalysisRequest): Promise<Response> {
  return fetchFn(`${base()}/api/v1/agent/analysis/stream`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify(body)
  })
}
