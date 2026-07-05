<script lang="ts">
  import { chartTheme } from "$lib/charts/theme"
  import { featureImportanceOption } from "$lib/charts/feature-importance"
  import { lineMovementOption } from "$lib/charts/line-movement"
  import Chart from "$lib/components/charts/Chart.svelte"
  import DistributionsPanel from "$lib/components/charts/DistributionsPanel.svelte"
  import EdgeBadge from "$lib/components/common/EdgeBadge.svelte"
  import EmptyState from "$lib/components/common/EmptyState.svelte"
  import Markdown from "$lib/components/common/Markdown.svelte"
  import StatCard from "$lib/components/common/StatCard.svelte"
  import { pageContext } from "$lib/stores/page-context.svelte"
  import { preferences } from "$lib/stores/preferences.svelte"
  import { formatAmerican, formatDateTime, formatProbability } from "$lib/utils/format"

  let { data } = $props()

  const edge = $derived(data.edge)

  $effect(() => {
    pageContext.set({ type: "edge", edgeId: edge.id, label: edge.selection })
    return () => pageContext.clear()
  })
  const theme = $derived(chartTheme(preferences.mode))
  const matchup = $derived(
    edge.game
      ? `${edge.game.away_team.abbreviation} @ ${edge.game.home_team.abbreviation}`
      : edge.selection
  )
</script>

<svelte:head><title>{edge.selection} · BookieBreaker</title></svelte:head>

<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
  <div>
    <h1 class="text-2xl font-bold">
      {edge.selection}
      <span class="ml-2 align-middle"><EdgeBadge points={edge.edge_percentage} /></span>
    </h1>
    <p class="text-sm opacity-70">
      {matchup} · {edge.league} · {edge.market_type} · {edge.sportsbook_key} ·
      {formatDateTime(edge.game?.scheduled_start ?? edge.expires_at)}
      {#if edge.is_stale}
        <span class="badge preset-tonal-warning ml-1 text-xs">stale</span>
      {/if}
    </p>
  </div>
  {#if edge.paper_bet}
    <span class="badge preset-tonal-primary">
      bet placed: {edge.paper_bet.stake.toFixed(2)}u ({edge.paper_bet.result})
    </span>
  {:else}
    <a href="/bets?edge={edge.id}" class="btn preset-filled-primary-500">Bet this edge</a>
  {/if}
</div>

<div class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
  <StatCard
    label="Model probability"
    value={formatProbability(edge.predicted_probability)}
    detail={edge.simulation_probability !== null
      ? `simulation: ${formatProbability(edge.simulation_probability)}`
      : ""}
  />
  <StatCard
    label="Market (de-vigged)"
    value={formatProbability(edge.implied_probability)}
    detail={`odds ${formatAmerican(edge.odds_american)} (${edge.odds_decimal.toFixed(3)})`}
  />
  <StatCard
    label="Expected value"
    value={edge.expected_value.toFixed(3)}
    tone={edge.expected_value >= 0 ? "positive" : "negative"}
    detail={`kelly ${edge.kelly_fraction.toFixed(3)} · stake ${edge.recommended_stake.toFixed(2)}u`}
  />
  <StatCard
    label="Confidence"
    value={edge.confidence === null ? "—" : formatProbability(edge.confidence, 0)}
    detail={`detected ${formatDateTime(edge.detected_at)}`}
  />
</div>

<div class="grid gap-6 xl:grid-cols-2">
  <section class="card preset-outlined-surface-200-800 p-4">
    <h2 class="mb-2 font-semibold">Feature importance</h2>
    {#if edge.prediction && Object.keys(edge.prediction.feature_importance).length > 0}
      <Chart
        option={featureImportanceOption(edge.prediction.feature_importance, theme)}
        ariaLabel="feature importance"
      />
      {#if edge.prediction.adjustment_magnitude}
        <p class="mt-1 text-xs opacity-60">
          ML adjustment over simulation: {edge.prediction.adjustment_magnitude.toFixed(4)}
        </p>
      {/if}
    {:else}
      <EmptyState title="No prediction detail" message="The prediction engine is unavailable." />
    {/if}
  </section>

  <section class="card preset-outlined-surface-200-800 p-4">
    <h2 class="mb-2 font-semibold">Line movement</h2>
    {#if data.movement && data.movement.length > 0}
      <Chart option={lineMovementOption(data.movement, theme)} ariaLabel="line movement" />
    {:else}
      <EmptyState title="No movement history" message="No line snapshots found for this game." />
    {/if}
  </section>
</div>

<section class="card preset-outlined-surface-200-800 mt-6 p-4">
  <h2 class="mb-2 font-semibold">Simulation distributions</h2>
  <DistributionsPanel gameId={edge.game_id} marketLine={edge.betting_line?.line_value ?? null} />
</section>

<section class="card preset-outlined-surface-200-800 mt-6 p-4">
  <h2 class="mb-2 font-semibold">Analysis</h2>
  {#if data.analysis}
    <p class="mb-2 text-xs opacity-60">
      {data.analysis.title} · {data.analysis.model_used} · {formatDateTime(
        data.analysis.created_at
      )}
    </p>
    <Markdown content={data.analysis.content} />
  {:else}
    <EmptyState
      title="No analysis yet"
      message="Ask the analyst about this edge from the chat sidebar."
    />
  {/if}
</section>
