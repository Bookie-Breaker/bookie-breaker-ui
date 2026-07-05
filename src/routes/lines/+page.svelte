<script lang="ts">
  import { goto } from "$app/navigation"
  import { page } from "$app/state"

  import type { Envelope, LineMovement, LineSnapshot } from "$lib/api/envelope"
  import { lineMovementOption } from "$lib/charts/line-movement"
  import { chartTheme } from "$lib/charts/theme"
  import Chart from "$lib/components/charts/Chart.svelte"
  import EmptyState from "$lib/components/common/EmptyState.svelte"
  import { preferences } from "$lib/stores/preferences.svelte"
  import { formatAmerican, formatLine, formatProbability } from "$lib/utils/format"

  let { data } = $props()

  const LEAGUES = ["", "NBA", "NFL", "MLB", "NCAA_BB", "NCAA_FB", "NCAA_BSB"]
  const MARKETS = ["", "SPREAD", "TOTAL", "MONEYLINE"]

  const theme = $derived(chartTheme(preferences.mode))

  interface GameGroup {
    gameId: string
    snapshots: LineSnapshot[]
    bestOdds: number
  }

  const games = $derived.by(() => {
    const grouped = new Map<string, LineSnapshot[]>()
    for (const snapshot of data.lines) {
      const list = grouped.get(snapshot.game_id) ?? []
      list.push(snapshot)
      grouped.set(snapshot.game_id, list)
    }
    return [...grouped.entries()].map(([gameId, snapshots]): GameGroup => ({
      gameId,
      snapshots,
      bestOdds: Math.max(...snapshots.map((s) => s.odds_american))
    }))
  })

  let expanded = $state<string | null>(null)
  let movement = $state<LineMovement[] | null>(null)
  let movementStatus = $state<"idle" | "loading" | "error">("idle")

  function setParam(key: string, value: string): void {
    const params = new URLSearchParams(page.url.searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    goto(`/lines?${params}`, { keepFocus: true, noScroll: true })
  }

  async function toggleMovement(gameId: string): Promise<void> {
    if (expanded === gameId) {
      expanded = null
      return
    }
    expanded = gameId
    movement = null
    movementStatus = "loading"
    try {
      const marketType = page.url.searchParams.get("market_type") ?? "SPREAD"
      const response = await fetch(`/api/lines/${gameId}/movement?market_type=${marketType}`)
      if (!response.ok) {
        movementStatus = "error"
        return
      }
      movement = ((await response.json()) as Envelope<LineMovement[]>).data
      movementStatus = "idle"
    } catch {
      movementStatus = "error"
    }
  }
</script>

<svelte:head><title>Lines · BookieBreaker</title></svelte:head>

<h1 class="mb-4 text-2xl font-bold">Current lines</h1>

<div class="mb-4 flex flex-wrap items-end gap-3">
  <label class="label">
    <span class="label-text text-xs">League</span>
    <select
      class="select w-36"
      value={page.url.searchParams.get("league") ?? ""}
      onchange={(event) => setParam("league", event.currentTarget.value)}
    >
      {#each LEAGUES as league (league)}
        <option value={league}>{league || "All"}</option>
      {/each}
    </select>
  </label>
  <label class="label">
    <span class="label-text text-xs">Market</span>
    <select
      class="select w-36"
      value={page.url.searchParams.get("market_type") ?? ""}
      onchange={(event) => setParam("market_type", event.currentTarget.value)}
    >
      {#each MARKETS as market (market)}
        <option value={market}>{market || "All"}</option>
      {/each}
    </select>
  </label>
</div>

{#if games.length === 0}
  <EmptyState title="No current lines" message="Lines appear once ingestion has run." />
{:else}
  <div class="space-y-4">
    {#each games as game (game.gameId)}
      <div class="card preset-outlined-surface-200-800 p-3">
        <div class="mb-2 flex items-center justify-between">
          <span class="font-mono text-xs opacity-60">{game.gameId}</span>
          <button
            type="button"
            class="btn btn-sm hover:preset-tonal"
            onclick={() => toggleMovement(game.gameId)}
          >
            {expanded === game.gameId ? "Hide movement" : "Show movement"}
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="table w-full text-sm">
            <thead>
              <tr class="text-left opacity-60">
                <th class="p-2">Book</th>
                <th class="p-2">Market</th>
                <th class="p-2">Selection</th>
                <th class="p-2 text-right">Line</th>
                <th class="p-2 text-right">Odds</th>
                <th class="p-2 text-right">Implied</th>
                <th class="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {#each game.snapshots as snapshot (snapshot.id)}
                <tr class="border-surface-200-800 border-t">
                  <td class="p-2">{snapshot.sportsbook_key}</td>
                  <td class="p-2">{snapshot.market_type}</td>
                  <td class="p-2">{snapshot.selection}</td>
                  <td class="p-2 text-right font-mono">{formatLine(snapshot.line_value)}</td>
                  <td
                    class="p-2 text-right font-mono {snapshot.odds_american === game.bestOdds
                      ? 'text-success-500 font-bold'
                      : ''}"
                  >
                    {formatAmerican(snapshot.odds_american)}
                  </td>
                  <td class="p-2 text-right font-mono">
                    {formatProbability(snapshot.implied_probability)}
                  </td>
                  <td class="p-2 text-xs">
                    {#if snapshot.is_opening}<span class="badge preset-tonal">open</span>{/if}
                    {#if snapshot.is_closing}<span class="badge preset-tonal">close</span>{/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        {#if expanded === game.gameId}
          <div class="mt-3">
            {#if movementStatus === "loading"}
              <div class="placeholder h-48 animate-pulse rounded"></div>
            {:else if movementStatus === "error"}
              <EmptyState title="Movement unavailable" />
            {:else if movement && movement.length > 0}
              <Chart
                option={lineMovementOption(movement, theme)}
                height="16rem"
                ariaLabel="line movement"
              />
            {:else}
              <EmptyState title="No movement history" />
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}
