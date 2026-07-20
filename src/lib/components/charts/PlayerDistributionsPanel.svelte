<script lang="ts">
  import type { Envelope, PlayerDistributionsData, PlayerPropsEntry } from "$lib/api/envelope"
  import { playerDistributionOption } from "$lib/charts/player-distribution"
  import { chartTheme } from "$lib/charts/theme"
  import Chart from "$lib/components/charts/Chart.svelte"
  import EmptyState from "$lib/components/common/EmptyState.svelte"
  import { preferences } from "$lib/stores/preferences.svelte"
  import { formatProbability } from "$lib/utils/format"
  import { playerSlug, statLabel } from "$lib/utils/props"

  let {
    gameId,
    playerName,
    slug = null,
    statType = null,
    propLine = null
  }: {
    gameId: string
    /** Display name from the edge, used for headings and slug matching. */
    playerName: string
    /** ADR-029 name slug; falls back to slugging playerName. */
    slug?: string | null
    /** Canonical stat key when the edge carries one; null shows all stats. */
    statType?: string | null
    propLine?: number | null
  } = $props()

  let status = $state<"loading" | "ready" | "expired" | "error">("loading")
  let data = $state<PlayerDistributionsData | null>(null)

  const theme = $derived(chartTheme(preferences.mode))
  const targetSlug = $derived(slug ?? playerSlug(playerName))

  const player = $derived.by((): PlayerPropsEntry | null => {
    if (!data) return null
    for (const entry of Object.values(data.players)) {
      if (playerSlug(entry.name) === targetSlug) return entry
    }
    return null
  })

  // The edge's stat when the run captured it, every captured stat otherwise.
  const stats = $derived.by(() => {
    if (!player) return []
    const entries = Object.entries(player.stats)
    if (statType && player.stats[statType]) {
      return entries.filter(([key]) => key === statType)
    }
    return entries
  })

  $effect(() => {
    let cancelled = false
    status = "loading"
    const query = statType ? `?stat_type=${encodeURIComponent(statType)}` : ""
    fetch(`/api/simulations/${gameId}/player-distributions${query}`)
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
        data = ((await response.json()) as Envelope<PlayerDistributionsData>).data
        status = "ready"
      })
      .catch(() => {
        if (!cancelled) status = "error"
      })
    return () => {
      cancelled = true
    }
  })

  /** over_probabilities as sorted [line, probability] chips. */
  function overChips(probabilities: Record<string, number> | null | undefined) {
    return Object.entries(probabilities ?? {})
      .map(([line, probability]) => [Number(line), probability] as [number, number])
      .sort((a, b) => a[0] - b[0])
  }
</script>

{#if status === "loading"}
  <div class="placeholder h-64 animate-pulse rounded"></div>
{:else if status === "expired"}
  <EmptyState
    title="Player distributions unavailable"
    message="Simulation results are kept for ~2 hours and player props are only captured on prop-enabled runs. Re-run the pipeline to regenerate them."
  />
{:else if status === "error"}
  <EmptyState
    title="Simulation unavailable"
    message="The simulation engine could not be reached."
  />
{:else if !player}
  <EmptyState
    title="Player not simulated"
    message={`The latest simulation run has no distribution for ${playerName}.`}
  />
{:else}
  <div class="grid gap-4 lg:grid-cols-2">
    {#each stats as [key, block] (key)}
      {@const label = statLabel(key) ?? key}
      <div>
        <h3 class="mb-1 text-sm font-semibold">{player.name} · {label}</h3>
        <Chart
          option={playerDistributionOption(block.distribution, theme, {
            propLine: statType === null || key === statType ? propLine : null,
            name: label.toLowerCase()
          })}
          height="16rem"
          ariaLabel="{player.name} {label} distribution"
        />
        <div class="mt-2 flex flex-wrap gap-1">
          {#if block.yes_probability !== null && block.yes_probability !== undefined}
            <span class="badge preset-tonal-success text-xs">
              Yes {formatProbability(block.yes_probability)}
            </span>
            <span class="badge preset-tonal text-xs">
              No {formatProbability(1 - block.yes_probability)}
            </span>
          {:else}
            {#each overChips(block.over_probabilities) as [line, probability] (line)}
              <span
                class="badge {line === propLine
                  ? 'preset-filled-primary-500'
                  : 'preset-tonal'} text-xs"
              >
                Over {line} · {formatProbability(probability)}
              </span>
            {/each}
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}
