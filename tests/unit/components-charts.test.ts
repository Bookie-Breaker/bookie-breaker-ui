/**
 * Chart wrapper and distribution panels server-rendered. Panels fetch in a
 * client-only $effect, so SSR shows the loading placeholder — the data states
 * are covered through the pure option builders in charts.test.ts.
 */
import { render } from "svelte/server"
import { describe, expect, it } from "vitest"

import { echarts } from "$lib/charts/echarts"
import Chart from "$lib/components/charts/Chart.svelte"
import DistributionsPanel from "$lib/components/charts/DistributionsPanel.svelte"
import PlayerDistributionsPanel from "$lib/components/charts/PlayerDistributionsPanel.svelte"

describe("echarts registry", () => {
  it("exports a configured echarts core", () => {
    expect(typeof echarts.init).toBe("function")
    expect(typeof echarts.use).toBe("function")
    expect(typeof echarts.getInstanceByDom).toBe("function")
  })
})

describe("Chart", () => {
  it("renders an accessible container with the requested height", () => {
    const { body } = render(Chart, {
      props: { option: {}, height: "16rem", ariaLabel: "line movement" }
    })
    expect(body).toContain('role="img"')
    expect(body).toContain('aria-label="line movement"')
    expect(body).toContain("height: 16rem")
  })

  it("defaults the height and label", () => {
    const { body } = render(Chart, { props: { option: {} } })
    expect(body).toContain('aria-label="chart"')
    expect(body).toContain("height: 20rem")
  })
})

describe("DistributionsPanel", () => {
  it("server-renders the loading placeholder before the client fetch", () => {
    const { body } = render(DistributionsPanel, { props: { gameId: "g-1" } })
    expect(body).toContain("animate-pulse")
    expect(body).not.toContain("Simulation expired")
  })
})

describe("PlayerDistributionsPanel", () => {
  it("server-renders the loading placeholder before the client fetch", () => {
    const { body } = render(PlayerDistributionsPanel, {
      props: { gameId: "g-1", playerName: "Bukayo Saka", statType: "player_shots", propLine: 2.5 }
    })
    expect(body).toContain("animate-pulse")
    expect(body).not.toContain("Player not simulated")
  })
})
