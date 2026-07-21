/**
 * Common presentational components server-rendered (same pattern as
 * edges-table.test.ts): props in, HTML out.
 */
import { render } from "svelte/server"
import { describe, expect, it, vi } from "vitest"

// dompurify needs a browser window; in node tests markdown passes through raw.
vi.mock("dompurify", () => ({ default: { sanitize: (html: string) => html } }))

import EmptyState from "$lib/components/common/EmptyState.svelte"
import ErrorPanel from "$lib/components/common/ErrorPanel.svelte"
import Markdown from "$lib/components/common/Markdown.svelte"
import StatCard from "$lib/components/common/StatCard.svelte"

describe("StatCard", () => {
  it("renders label, value, and optional detail", () => {
    const { body } = render(StatCard, {
      props: { label: "ROI", value: "+6.2%", detail: "4.1u over 137 bets" }
    })
    expect(body).toContain("ROI")
    expect(body).toContain("+6.2%")
    expect(body).toContain("4.1u over 137 bets")
  })

  it("omits the detail row when empty and applies tone classes", () => {
    const positive = render(StatCard, {
      props: { label: "ROI", value: "+6.2%", tone: "positive" }
    })
    expect(positive.body).toContain("text-success-500")
    expect(positive.body).not.toContain("text-xs opacity-70")

    const negative = render(StatCard, {
      props: { label: "ROI", value: "-2.0%", tone: "negative" }
    })
    expect(negative.body).toContain("text-error-500")

    const neutral = render(StatCard, { props: { label: "Bets", value: "137" } })
    expect(neutral.body).not.toContain("text-success-500")
    expect(neutral.body).not.toContain("text-error-500")
  })
})

describe("EmptyState", () => {
  it("renders the default title without a message", () => {
    const { body } = render(EmptyState, { props: {} })
    expect(body).toContain("Nothing here yet")
  })

  it("renders custom title and message", () => {
    const { body } = render(EmptyState, {
      props: { title: "No edges right now", message: "Run the pipeline." }
    })
    expect(body).toContain("No edges right now")
    expect(body).toContain("Run the pipeline.")
  })
})

describe("ErrorPanel", () => {
  it("renders the default copy", () => {
    const { body } = render(ErrorPanel, { props: {} })
    expect(body).toContain("Something went wrong")
    expect(body).toContain("A backend service is unavailable")
  })

  it("renders custom title and message", () => {
    const { body } = render(ErrorPanel, {
      props: { title: "Agent down", message: "The agent service is unavailable." }
    })
    expect(body).toContain("Agent down")
    expect(body).toContain("The agent service is unavailable.")
  })
})

describe("Markdown", () => {
  it("renders markdown to HTML through marked", () => {
    const { body } = render(Markdown, { props: { content: "# Verdict\n\n- lean **over**" } })
    expect(body).toContain("<h1>Verdict</h1>")
    expect(body).toContain("<strong>over</strong>")
    expect(body).toContain("<li>")
  })
})
