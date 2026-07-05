import { describe, expect, it, vi } from "vitest"

import { isErrorEnvelope } from "$lib/api/envelope"
import { buildUrl, upstream, UpstreamError } from "$lib/server/http"

describe("buildUrl", () => {
  it("appends defined query params only", () => {
    const url = buildUrl("http://agent:8006", "/api/v1/agent/edges", {
      league: "NBA",
      min_edge: 2,
      is_stale: false,
      cursor: undefined,
      date: null,
      market_type: ""
    })
    expect(url).toBe("http://agent:8006/api/v1/agent/edges?league=NBA&min_edge=2&is_stale=false")
  })

  it("returns a bare url without query params", () => {
    expect(buildUrl("http://agent:8006", "/api/v1/agent/dashboard")).toBe(
      "http://agent:8006/api/v1/agent/dashboard"
    )
  })
})

describe("isErrorEnvelope", () => {
  it("accepts the standard error envelope", () => {
    expect(
      isErrorEnvelope({ error: { code: "RESOURCE_NOT_FOUND", message: "nope" }, meta: {} })
    ).toBe(true)
  })

  it("rejects success envelopes and junk", () => {
    expect(isErrorEnvelope({ data: [], meta: {} })).toBe(false)
    expect(isErrorEnvelope(null)).toBe(false)
    expect(isErrorEnvelope("error")).toBe(false)
    expect(isErrorEnvelope({ error: "boom" })).toBe(false)
  })
})

describe("upstream", () => {
  it("parses a success envelope", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ data: { ok: true }, meta: { timestamp: "t", request_id: "r" } }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      )
    )
    const result = await upstream<{ data: { ok: boolean } }>("http://x", "/path", { fetchFn })
    expect(result.data.ok).toBe(true)
  })

  it("rethrows upstream error envelopes with their status", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "RESOURCE_NOT_FOUND", message: "missing" }, meta: {} }),
        {
          status: 404
        }
      )
    )
    const error = await upstream("http://x", "/path", { fetchFn }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(UpstreamError)
    expect((error as UpstreamError).status).toBe(404)
    expect((error as UpstreamError).body.code).toBe("RESOURCE_NOT_FOUND")
  })

  it("maps non-envelope failures to DEPENDENCY_ERROR", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("boom", { status: 500 }))
    const error = await upstream("http://x", "/path", { fetchFn }).catch((e: unknown) => e)
    expect((error as UpstreamError).body.code).toBe("DEPENDENCY_ERROR")
    expect((error as UpstreamError).status).toBe(500)
  })

  it("maps network failures to TIMEOUT", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError("fetch failed"))
    const error = await upstream("http://x", "/path", { fetchFn }).catch((e: unknown) => e)
    expect((error as UpstreamError).status).toBe(504)
    expect((error as UpstreamError).body.code).toBe("TIMEOUT")
  })

  it("serializes POST bodies and custom headers", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: {}, meta: {} }), { status: 201 }))
    await upstream("http://x", "/bets", {
      fetchFn,
      method: "POST",
      body: { stake: 1.5 },
      headers: { "X-Idempotency-Key": "abc" }
    })
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("http://x/bets")
    expect(init.method).toBe("POST")
    expect(init.body).toBe(JSON.stringify({ stake: 1.5 }))
    expect((init.headers as Record<string, string>)["X-Idempotency-Key"]).toBe("abc")
    expect((init.headers as Record<string, string>)["content-type"]).toBe("application/json")
  })
})
