/**
 * Standard response envelope per api-contracts/README.md, plus friendly
 * aliases over the generated OpenAPI types (src/lib/api/gen, ADR-016).
 */
import type { components as agent } from "./gen/agent"
import type { components as emulator } from "./gen/bookie-emulator"
import type { components as lines } from "./gen/lines-service"
import type { components as prediction } from "./gen/prediction-engine"
import type { components as simulation } from "./gen/simulation-engine"

export interface Meta {
  timestamp: string
  request_id: string
}

export interface Pagination {
  limit: number
  has_more: boolean
  next_cursor?: string | null
}

export interface PageMeta extends Meta {
  pagination: Pagination
}

export interface Envelope<T> {
  data: T
  meta: Meta
}

export interface PageEnvelope<T> {
  data: T[]
  meta: PageMeta
}

export interface ApiErrorBody {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ErrorEnvelope {
  error: ApiErrorBody
  meta: Meta
}

/** True when a parsed JSON body looks like the standard error envelope. */
export function isErrorEnvelope(body: unknown): body is ErrorEnvelope {
  return (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as ErrorEnvelope).error?.code === "string"
  )
}

// agent
export type EdgeListItem = agent["schemas"]["EdgeListItem"]
export type EdgeDetail = agent["schemas"]["EdgeDetailData"]
export type SlateData = agent["schemas"]["SlateData"]
export type DashboardData = agent["schemas"]["DashboardData"]
export type AlertData = agent["schemas"]["AlertData"]
export type AnalysisData = agent["schemas"]["AnalysisData"]
export type AnalysisRequest = agent["schemas"]["AnalysisRequest"]
export type PipelineRunData = agent["schemas"]["PipelineRunData"]
export type PipelineRunAccepted = agent["schemas"]["PipelineRunAcceptedData"]
export type ParlayEvaluateRequest = agent["schemas"]["ParlayEvaluateRequest"]
export type ParlayEvaluationData = agent["schemas"]["ParlayEvaluationData"]
export type ParlayEvaluatedLeg = agent["schemas"]["ParlayLegData"]

// bookie-emulator
export type BetData = emulator["schemas"]["BetData"]
export type BetDetailData = emulator["schemas"]["BetDetailData"]
export type PlaceBetRequest = emulator["schemas"]["PlaceBetRequest"]
export type PerformanceData = emulator["schemas"]["PerformanceData"]
export type BreakdownData = emulator["schemas"]["BreakdownData"]
export type CalibrationData = emulator["schemas"]["CalibrationData"]
export type CalibrationBin = emulator["schemas"]["CalibrationBinData"]
export type PlaceParlayRequest = emulator["schemas"]["PlaceParlayRequest"]
export type ParlayDetailData = emulator["schemas"]["ParlayDetailData"]
export type ParlayLeg = emulator["schemas"]["ParlayLegData"]
export type ParlayPlaceLegRequest = emulator["schemas"]["ParlayLegRequest"]
export type BankrollData = emulator["schemas"]["BankrollData"]
export type BankrollHistoryData = emulator["schemas"]["BankrollHistoryData"]
export type BankrollSnapshot = emulator["schemas"]["HistorySnapshotData"]

// lines-service
export type LineSnapshot = lines["schemas"]["LineSnapshot"]
export type LineMovement = lines["schemas"]["LineMovement"]
export type BestLine = lines["schemas"]["BestLine"]
export type Sportsbook = lines["schemas"]["Sportsbook"]

// simulation-engine
export type SimulationRun = simulation["schemas"]["SimulationRunData"]
export type DistributionsData = simulation["schemas"]["DistributionsData"]
export type Distribution = simulation["schemas"]["Distribution"]

// prediction-engine
export type PredictionDetail = prediction["schemas"]["PredictionDetailData"]
