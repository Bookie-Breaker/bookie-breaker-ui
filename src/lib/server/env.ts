/**
 * Server-only configuration. $env/dynamic/private keeps values out of the
 * client bundle and reads them at runtime, so one image works in any env.
 */
import { env } from "$env/dynamic/private"

const DEFAULTS: Record<string, string> = {
  AGENT_URL: "http://localhost:8006",
  BOOKIE_EMULATOR_URL: "http://localhost:8005",
  LINES_SERVICE_URL: "http://localhost:8001",
  STATISTICS_SERVICE_URL: "http://localhost:8002",
  SIMULATION_ENGINE_URL: "http://localhost:8003",
  PREDICTION_ENGINE_URL: "http://localhost:8004"
}

/** Base URL for an upstream service, without a trailing slash. */
export function serviceUrl(name: keyof typeof DEFAULTS): string {
  const value = env[name] || DEFAULTS[name]
  return value.replace(/\/+$/, "")
}

/** Redis connection URL for the SSE bridge; null disables the bridge. */
export function redisUrl(): string | null {
  return env.REDIS_URL || null
}
