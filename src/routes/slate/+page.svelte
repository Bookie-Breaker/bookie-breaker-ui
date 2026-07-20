<script lang="ts">
  import EmptyState from "$lib/components/common/EmptyState.svelte"
  import { formatDate, formatDateTime, formatProbability } from "$lib/utils/format"
  import { isPlayerProp, propView, type PropEdgeFields } from "$lib/utils/props"

  let { data } = $props()

  type SlateEdge = (typeof data.slate.games)[number]["edges"][number]

  const gameLineEdges = (edges: SlateEdge[]) => edges.filter((edge) => !isPlayerProp(edge))
  const propEdges = (edges: SlateEdge[]) => edges.filter((edge) => isPlayerProp(edge))

  /** Compact chip label for a prop edge: "Bukayo Saka Shots OVER 2.5". */
  function propChipLabel(edge: SlateEdge): string {
    const prop = propView(edge as SlateEdge & PropEdgeFields)
    const parts = [prop.player, prop.statLabel ?? "prop"]
    if (prop.side) parts.push(prop.side)
    if (prop.line !== null) parts.push(String(prop.line))
    return parts.join(" ")
  }
</script>

<svelte:head><title>Slate · BookieBreaker</title></svelte:head>

<h1 class="mb-1 text-2xl font-bold">Today's slate</h1>
<p class="mb-4 text-sm opacity-70">{formatDate(data.slate.date)}</p>

{#if data.slate.games.length === 0}
  <EmptyState title="No games today" message="Check back when the schedule fills in." />
{:else}
  <div class="grid gap-4 lg:grid-cols-2">
    {#each data.slate.games as game (game.game_id)}
      {@const props = propEdges(game.edges)}
      {@const gameLines = gameLineEdges(game.edges)}
      <div class="card preset-outlined-surface-200-800 p-4">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="font-semibold">
              {game.away_team.name} @ {game.home_team.name}
              {#if props.length > 0}
                <span class="badge preset-tonal ml-1 align-middle text-xs">
                  {props.length}
                  {props.length === 1 ? "prop" : "props"}
                </span>
              {/if}
            </p>
            <p class="text-xs opacity-60">
              {game.league} · {formatDateTime(game.scheduled_start)} · {game.status}
            </p>
          </div>
          {#if game.prediction}
            <span class="badge preset-tonal text-xs">
              {game.prediction.selection}
              {formatProbability(game.prediction.predicted_probability)}
            </span>
          {/if}
        </div>
        {#if game.edges.length > 0}
          <div class="mt-3 flex flex-wrap gap-2">
            {#each gameLines as edge (edge.id)}
              <a
                href="/edges/{edge.id}"
                class="badge {edge.has_paper_bet
                  ? 'preset-tonal-primary'
                  : 'preset-tonal-success'} text-xs"
              >
                {edge.market_type}
                {edge.selection} +{edge.edge_percentage.toFixed(1)}% @ {edge.sportsbook_key}
              </a>
            {/each}
            {#each props as edge (edge.id)}
              <a
                href="/edges/{edge.id}"
                class="badge {edge.has_paper_bet ? 'preset-tonal-primary' : 'preset-tonal'} text-xs"
              >
                {propChipLabel(edge)} +{edge.edge_percentage.toFixed(1)}% @ {edge.sportsbook_key}
              </a>
            {/each}
          </div>
        {:else}
          <p class="mt-3 text-xs opacity-50">No edges detected</p>
        {/if}
      </div>
    {/each}
  </div>
{/if}
