/**
 * Shared upstream fetch for load functions and /api proxy routes.
 *
 * Base URLs are fixed from env and paths are fixed per call site — the
 * browser can never steer a request to an arbitrary backend path. Query
 * params are passed explicitly (undefined/null skipped), inbound cookies
 * are never forwarded, and upstream error envelopes are re-thrown with
 * their status so routes can pass them through verbatim.
 */
import { isErrorEnvelope, type ApiErrorBody } from "$lib/api/envelope"

const DEFAULT_TIMEOUT_MS = 10_000

export type QueryParams = Record<string, string | number | boolean | undefined | null>

export class UpstreamError extends Error {
  readonly status: number
  readonly body: ApiErrorBody

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.status = status
    this.body = body
  }
}

export interface UpstreamOptions {
  /** SvelteKit's event.fetch when available (tracing, deduping). */
  fetchFn?: typeof fetch
  method?: "GET" | "POST" | "PUT" | "DELETE"
  query?: QueryParams
  body?: unknown
  headers?: Record<string, string>
  timeoutMs?: number
}

export function buildUrl(base: string, path: string, query?: QueryParams): string {
  const url = new URL(base + path)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

export async function upstream<T>(
  base: string,
  path: string,
  options: UpstreamOptions = {}
): Promise<T> {
  const {
    fetchFn = fetch,
    method = "GET",
    query,
    body,
    headers = {},
    timeoutMs = DEFAULT_TIMEOUT_MS
  } = options
  const requestHeaders: Record<string, string> = { accept: "application/json", ...headers }
  const init: RequestInit = {
    method,
    headers: requestHeaders,
    signal: AbortSignal.timeout(timeoutMs)
  }
  if (body !== undefined) {
    requestHeaders["content-type"] = "application/json"
    init.body = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetchFn(buildUrl(base, path, query), init)
  } catch (cause) {
    throw new UpstreamError(504, {
      code: "TIMEOUT",
      message: "Upstream service did not respond",
      details: { cause: cause instanceof Error ? cause.message : String(cause) }
    })
  }

  const parsed: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    if (isErrorEnvelope(parsed)) {
      throw new UpstreamError(response.status, parsed.error)
    }
    throw new UpstreamError(response.status, {
      code: "DEPENDENCY_ERROR",
      message: `Upstream service returned ${response.status}`
    })
  }
  return parsed as T
}
