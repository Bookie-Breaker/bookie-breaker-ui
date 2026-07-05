/** Analysis reads, split out so the edge-detail load stays tidy. */
import type { AnalysisData, Envelope } from "$lib/api/envelope"
import { serviceUrl } from "$lib/server/env"
import { upstream } from "$lib/server/http"

export function getAnalysis(
  fetchFn: typeof fetch,
  analysisId: string
): Promise<Envelope<AnalysisData>> {
  return upstream(
    serviceUrl("AGENT_URL"),
    `/api/v1/agent/analysis/${encodeURIComponent(analysisId)}`,
    {
      fetchFn
    }
  )
}
