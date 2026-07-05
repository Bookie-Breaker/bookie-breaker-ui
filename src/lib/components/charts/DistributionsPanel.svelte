<script lang="ts">
  import type { Distribution, DistributionsData, Envelope } from "$lib/api/envelope"
  import { distributionOption } from "$lib/charts/distribution"
  import { chartTheme } from "$lib/charts/theme"
  import Chart from "$lib/components/charts/Chart.svelte"
  import EmptyState from "$lib/components/common/EmptyState.svelte"
  import { preferences } from "$lib/stores/preferences.svelte"

  let {
    gameId,
    marketLine = null
  }: {
    gameId: string
    marketLine?: number | null
  } = $props()

  let status = $state<"loading" | "ready" | "expired" | "error">("loading")
  let distributions = $state<DistributionsData | null>(null)

  const theme = $derived(chartTheme(preferences.mode))

  const entries = $derived(
    distributions ? (Object.entries(distributions.distributions) as [string, Distribution][]) : []
  )

  $effect(() => {
    let cancelled = false
    status = "loading"
    fetch(`/api/simulations/${gameId}/distributions`)
      .then(async (response) => {
        if (cancelled) return
        if (response.status === 404) {
          status = "expired"
          return
        }
        if (!response.ok) {
          status = "error"
          return
        }
        distributions = ((await response.json()) as Envelope<DistributionsData>).data
        status = "ready"
      })
      .catch(() => {
        if (!cancelled) status = "error"
      })
    return () => {
      cancelled = true
    }
  })
</script>

{#if status === "loading"}
  <div class="placeholder h-64 animate-pulse rounded"></div>
{:else if status === "expired"}
  <EmptyState
    title="Simulation expired"
    message="Simulation results are kept for ~2 hours. Re-run the pipeline to regenerate them."
  />
{:else if status === "error"}
  <EmptyState
    title="Simulation unavailable"
    message="The simulation engine could not be reached."
  />
{:else if distributions}
  <div class="grid gap-4 lg:grid-cols-2">
    {#each entries as [name, distribution] (name)}
      <div>
        <h3 class="mb-1 text-sm font-semibold capitalize">{name.replaceAll("_", " ")}</h3>
        <Chart
          option={distributionOption(distribution, theme, {
            marketLine: name === "margin" || name === "total" ? marketLine : null,
            name
          })}
          height="16rem"
          ariaLabel="{name} distribution"
        />
      </div>
    {/each}
  </div>
{/if}
