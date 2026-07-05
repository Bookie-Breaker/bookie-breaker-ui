<script lang="ts">
  import { invalidate } from "$app/navigation"

  import EmptyState from "$lib/components/common/EmptyState.svelte"
  import ErrorPanel from "$lib/components/common/ErrorPanel.svelte"
  import StatCard from "$lib/components/common/StatCard.svelte"
  import { formatDateTime, formatUnits } from "$lib/utils/format"

  let { data } = $props()

  let pipelineBusy = $state(false)

  async function acknowledge(alertId: string): Promise<void> {
    await fetch(`/api/alerts/${alertId}/acknowledge`, { method: "PUT" })
    await invalidate("app:dashboard")
  }

  async function runPipeline(): Promise<void> {
    pipelineBusy = true
    try {
      await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ league: "NBA" })
      })
      await invalidate("app:dashboard")
    } finally {
      pipelineBusy = false
    }
  }
</script>

<svelte:head><title>BookieBreaker</title></svelte:head>

<div class="mb-4 flex items-center justify-between">
  <h1 class="text-2xl font-bold">Dashboard</h1>
  <button
    type="button"
    class="btn preset-filled-primary-500"
    onclick={runPipeline}
    disabled={pipelineBusy}
  >
    {pipelineBusy ? "Starting…" : "Run pipeline"}
  </button>
</div>

{#if data.dashboard === null}
  <ErrorPanel message="The agent service is unavailable." />
{:else}
  {@const dash = data.dashboard}
  <div class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <StatCard
      label="Active edges"
      value={String(dash.active_edges.count)}
      detail={dash.active_edges.top_edge
        ? `top: ${dash.active_edges.top_edge.selection} (+${dash.active_edges.top_edge.edge_percentage.toFixed(1)}%)`
        : "no active edges"}
    />
    <StatCard
      label="Open bets"
      value={String(dash.open_bets?.count ?? 0)}
      detail={dash.open_bets ? `${dash.open_bets.total_exposure_units.toFixed(1)}u exposure` : ""}
    />
    <StatCard
      label="All-time ROI"
      value={dash.performance_summary
        ? `${(dash.performance_summary.all_time.roi * 100).toFixed(1)}%`
        : "—"}
      detail={dash.performance_summary
        ? `${formatUnits(dash.performance_summary.all_time.profit_units)} over ${dash.performance_summary.all_time.bets} bets`
        : "emulator unavailable"}
      tone={dash.performance_summary && dash.performance_summary.all_time.roi >= 0
        ? "positive"
        : "negative"}
    />
    <StatCard
      label="Next scheduled run"
      value={dash.pipeline_status.next_scheduled_run
        ? formatDateTime(dash.pipeline_status.next_scheduled_run)
        : "—"}
      detail={dash.pipeline_status.last_run
        ? `last: ${dash.pipeline_status.last_run.status} · ${dash.pipeline_status.last_run.edges_found} edges`
        : "no runs yet"}
    />
  </div>
{/if}

<h2 class="mb-2 text-lg font-semibold">Unacknowledged alerts</h2>
{#if data.alerts.length === 0}
  <EmptyState title="No alerts" message="New edge alerts will appear here." />
{:else}
  <ul class="space-y-2">
    {#each data.alerts as alert (alert.id)}
      <li class="card preset-outlined-surface-200-800 flex items-center justify-between gap-4 p-3">
        <div>
          <span class="badge preset-tonal-warning mr-2 text-xs">{alert.priority}</span>
          <span class="text-sm">{alert.message}</span>
          <a href="/edges/{alert.edge_id}" class="anchor ml-2 text-xs">view edge</a>
        </div>
        <button
          type="button"
          class="btn btn-sm hover:preset-tonal"
          onclick={() => acknowledge(alert.id)}
        >
          Acknowledge
        </button>
      </li>
    {/each}
  </ul>
{/if}
