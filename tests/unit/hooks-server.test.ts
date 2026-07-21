import { describe, expect, it, vi } from "vitest"

import { handle, handleError } from "../../src/hooks.server"

describe("handle", () => {
  it("adds security headers to every resolved response", async () => {
    const resolve = vi.fn().mockResolvedValue(new Response("ok"))
    const response = await handle({ event: {} as never, resolve })
    expect(resolve).toHaveBeenCalledOnce()
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(response.headers.get("Referrer-Policy")).toBe("same-origin")
    expect(await response.text()).toBe("ok")
  })
})

describe("handleError", () => {
  it("masks 404s and never leaks internals", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const result = handleError({
      error: new Error("ECONNREFUSED http://agent:8006"),
      status: 404,
      message: "Internal error",
      event: {} as never
    } as never)
    expect(result).toEqual({ message: "Not found" })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it("passes through the generic message for other statuses", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const result = handleError({
      error: new Error("boom"),
      status: 500,
      message: "Internal error",
      event: {} as never
    } as never)
    expect(result).toEqual({ message: "Internal error" })
    spy.mockRestore()
  })
})
