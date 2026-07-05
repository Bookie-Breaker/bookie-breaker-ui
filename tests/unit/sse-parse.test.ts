import { describe, expect, it } from "vitest"

import { createSseParser } from "$lib/utils/sse-parse"

describe("createSseParser", () => {
  it("parses complete frames", () => {
    const parse = createSseParser()
    const frames = parse('event: chunk\ndata: {"text": "hi"}\n\nevent: done\ndata: {}\n\n')
    expect(frames).toEqual([
      { event: "chunk", data: '{"text": "hi"}' },
      { event: "done", data: "{}" }
    ])
  })

  it("buffers frames split across chunks", () => {
    const parse = createSseParser()
    expect(parse("event: chunk\nda")).toEqual([])
    expect(parse('ta: {"text": "hel')).toEqual([])
    expect(parse('lo"}\n\n')).toEqual([{ event: "chunk", data: '{"text": "hello"}' }])
  })

  it("ignores comment/heartbeat frames", () => {
    const parse = createSseParser()
    expect(parse(": ping\n\nevent: chunk\ndata: {}\n\n")).toEqual([{ event: "chunk", data: "{}" }])
  })

  it("joins multi-line data", () => {
    const parse = createSseParser()
    expect(parse("event: chunk\ndata: line1\ndata: line2\n\n")).toEqual([
      { event: "chunk", data: "line1\nline2" }
    ])
  })
})
