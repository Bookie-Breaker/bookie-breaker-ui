<script lang="ts">
  import { goto } from "$app/navigation"
  import { page } from "$app/state"

  import { breakdownOption } from "$lib/charts/breakdown"
  import { calibrationOption } from "$lib/charts/calibration"
  import { roiOption } from "$lib/charts/roi"
  import { chartTheme } from "$lib/charts/theme"
  import { winRateClvOption } from "$lib/charts/win-rate-clv"
  import Chart from "$lib/components/charts/Chart.svelte"
  import EmptyState from "$lib/components/common/EmptyState.svelte"
  import ErrorPanel from "$lib/components/common/ErrorPanel.svelte"
  import StatCard from "$lib/components/common/StatCard.svelte"
  import { pageContext } from "$lib/stores/page-context.svelte"
  import { preferences } from "$lib/stores/preferences.svelte"
  import { formatProbability, formatUnits } from "$lib/utils/format"

  let { data } = $props()

  const theme = $derived(chartTheme(preferences.mode))

  $effect(() => {
    pageContext.set({ type: "performance" })
    return () => pageContext.clear()
  })

  function setGroupBy(value: string): void {
    const params = new URLSearchParams(page.url.searchParams)
    params.set("group_by", value)
    goto(`/performance?${params}`, { keepFocus: true, noScroll: true })
  }
</script>

<svelte:head><title>Performance · BookieBreaker</title></svelte:head>

<h1 class="mb-4 text-2xl font-bold">Paper trading performance</h1>

{#if data.performance === null}
  <ErrorPanel message="The bookie-emulator service is unavailable." />
{:else}
  {@const perf = data.performance}
  <div class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <StatCard
      label="ROI"
      value={`${(perf.roi * 100).toFixed(1)}%`}
      tone={perf.roi >= 0 ? "positive" : "negative"}
      detail={`${formatUnits(perf.total_profit_units)} over ${perf.total_bets} bets`}
    />
    <StatCard
      label="Win rate"
      value={formatProbability(perf.win_rate)}
      detail={`${perf.total_wins}-${perf.total_losses}-${perf.total_pushes} · streaks W${perf.longest_win_streak}/L${perf.longest_loss_streak}`}
    />
    <StatCard
      label="Avg CLV"
      value={perf.avg_clv === null ? "—" : formatProbability(perf.avg_clv, 2)}
      tone={perf.avg_clv !== null && perf.avg_clv > 0 ? "positive" : "neutral"}
      detail="closing line value captured at grading"
    />
    <StatCard
      label="Calibration"
      value={perf.calibration_error === null ? "—" : perf.calibration_error.toFixed(3)}
      detail={perf.brier_score === null
        ? "no settled bets"
        : `brier ${perf.brier_score.toFixed(3)}`}
    />
  </div>
{/if}

<div class="grid gap-6 xl:grid-cols-2">
  <section class="card preset-outlined-surface-200-800 p-4">
    <h2 class="mb-2 font-semibold">Bankroll & ROI over time</h2>
    {#if data.history && data.history.snapshots.length > 0}
      <Chart option={roiOption(data.history.snapshots, theme)} ariaLabel="bankroll and roi" />
    {:else}
      <EmptyState title="No graded bets yet" />
    {/if}
  </section>

  <section class="card preset-outlined-surface-200-800 p-4">
    <h2 class="mb-2 font-semibold">Win rate & CLV over time</h2>
    {#if data.history && data.history.snapshots.length > 0}
      <Chart
        option={winRateClvOption(data.history.snapshots, theme)}
        ariaLabel="win rate and clv"
      />
    {:else}
      <EmptyState title="No graded bets yet" />
    {/if}
  </section>

  <section class="card preset-outlined-surface-200-800 p-4">
    <h2 class="mb-2 font-semibold">Calibration</h2>
    {#if data.calibration && data.calibration.total_graded > 0}
      <Chart option={calibrationOption(data.calibration, theme)} ariaLabel="calibration plot" />
      <p class="mt-1 text-xs opacity-60">
        {data.calibration.total_graded} settled bets · noisy below ~100
      </p>
    {:else}
      <EmptyState title="Not enough data" message="The calibration plot needs settled bets." />
    {/if}
  </section>

  <section class="card preset-outlined-surface-200-800 p-4">
    <div class="mb-2 flex items-center justify-between">
      <h2 class="font-semibold">Breakdown</h2>
      <select
        class="select w-40"
        value={data.groupBy}
        onchange={(event) => setGroupBy(event.currentTarget.value)}
      >
        <option value="league">By league</option>
        <option value="market_type">By market</option>
        <option value="sportsbook">By sportsbook</option>
        <option value="month">By month</option>
      </select>
    </div>
    {#if data.breakdown && data.breakdown.breakdowns.length > 0}
      <Chart option={breakdownOption(data.breakdown, theme)} ariaLabel="performance breakdown" />
    {:else}
      <EmptyState title="No graded bets yet" />
    {/if}
  </section>
</div>
