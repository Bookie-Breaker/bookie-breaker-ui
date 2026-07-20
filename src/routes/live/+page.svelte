<script lang="ts">
  import EdgeBadge from "$lib/components/common/EdgeBadge.svelte"
  import EmptyState from "$lib/components/common/EmptyState.svelte"
  import { formatAmerican, formatLine, formatProbability } from "$lib/utils/format"
  import { bestOddsBySelection, selectionKey } from "$lib/utils/lines"
  import { formatCountdown, groupLinesByGame } from "$lib/utils/live"

  let { data } = $props()

  const games = $derived(
    groupLinesByGame(data.liveLines).map((group) => ({
      ...group,
      bestOdds: bestOddsBySelection(group.snapshots)
    }))
  )

  // One shared ticking clock drives every countdown chip.
  let now = $state(Date.now())
  $effect(() => {
    const timer = setInterval(() => (now = Date.now()), 1_000)
    return () => clearInterval(timer)
  })

  function countdownClass(expiresAt: string, nowMs: number): string {
    const remaining = Date.parse(expiresAt) - nowMs
    if (!Number.isFinite(remaining) || remaining <= 0) return "preset-tonal-error"
    if (remaining < 60_000) return "preset-tonal-warning"
    return "preset-tonal"
  }
</script>

<svelte:head><title>Live · BookieBreaker</title></svelte:head>

<div class="mb-4 flex items-center gap-3">
  <h1 class="text-2xl font-bold">Live</h1>
  <span class="badge preset-filled-error-500 animate-pulse text-xs">IN PLAY</span>
</div>

{#if games.length === 0 && data.liveEdges.length === 0}
  <EmptyState
    title="No live games right now"
    message="Live lines and edges arrive automatically as games go in play — leave this page open."
  />
{:else}
  <section class="mb-6">
    <h2 class="mb-2 font-semibold">Live edges</h2>
    {#if data.liveEdges.length === 0}
      <EmptyState
        title="No live edges"
        message="Live lines are streaming, but no in-game edge clears the threshold yet."
      />
    {:else}
      <div class="overflow-x-auto">
        <table class="table w-full text-sm">
          <thead>
            <tr class="text-left opacity-60">
              <th class="p-2">Matchup</th>
              <th class="p-2">Selection</th>
              <th class="p-2">Book</th>
              <th class="p-2 text-right">Odds</th>
              <th class="p-2 text-right">Edge</th>
              <th class="p-2 text-right">EV</th>
              <th class="p-2 text-right">Model</th>
              <th class="p-2">Expires</th>
              <th class="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {#each data.liveEdges as edge (edge.id)}
              <tr class="hover:preset-tonal border-surface-200-800 border-t">
                <td class="p-2 whitespace-nowrap">
                  <a href="/edges/{edge.id}" class="anchor font-medium">
                    {edge.away_team ?? "?"} @ {edge.home_team ?? "?"}
                  </a>
                  <span class="ml-1 text-xs opacity-60">{edge.league}</span>
                </td>
                <td class="p-2 whitespace-nowrap">
                  <span class="badge preset-tonal mr-1 text-xs">{edge.market_type}</span>
                  {edge.selection}
                </td>
                <td class="p-2">{edge.sportsbook_key}</td>
                <td class="p-2 text-right font-mono">{formatAmerican(edge.odds_american)}</td>
                <td class="p-2 text-right"><EdgeBadge points={edge.edge_percentage} /></td>
                <td class="p-2 text-right font-mono">{edge.expected_value.toFixed(3)}</td>
                <td class="p-2 text-right font-mono">
                  {formatProbability(edge.predicted_probability)}
                </td>
                <td class="p-2 whitespace-nowrap">
                  <span
                    class="badge {countdownClass(edge.expires_at, now)} font-mono text-xs"
                    data-testid="edge-countdown"
                  >
                    {formatCountdown(edge.expires_at, now)}
                  </span>
                </td>
                <td class="p-2 whitespace-nowrap">
                  {#if edge.has_paper_bet}
                    <span class="badge preset-tonal-primary text-xs">bet placed</span>
                  {:else}
                    <a
                      href="/bets?edge={edge.id}&live=1"
                      class="btn btn-sm preset-filled-error-500"
                      aria-label="Bet live {edge.selection}"
                    >
                      Bet live
                    </a>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <section>
    <h2 class="mb-2 font-semibold">Live lines</h2>
    {#if games.length === 0}
      <EmptyState title="No live lines" message="No in-game lines are streaming right now." />
    {:else}
      <div class="space-y-4">
        {#each games as game (game.gameId)}
          <div class="card preset-outlined-surface-200-800 p-3">
            <div class="mb-2 flex items-center justify-between">
              <span class="flex items-center gap-2">
                <span class="badge preset-filled-error-500 text-xs">LIVE</span>
                <span class="font-mono text-xs opacity-60">{game.gameId}</span>
              </span>
              <a href="/bets?live=1" class="btn btn-sm hover:preset-tonal">Bet live</a>
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
                        class="p-2 text-right font-mono {snapshot.odds_american ===
                        game.bestOdds.get(selectionKey(snapshot))
                          ? 'text-success-500 font-bold'
                          : ''}"
                      >
                        {formatAmerican(snapshot.odds_american)}
                      </td>
                      <td class="p-2 text-right font-mono">
                        {formatProbability(snapshot.implied_probability)}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
{/if}
