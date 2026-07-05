<script lang="ts">
  import { goto } from "$app/navigation"
  import { page } from "$app/state"

  import type { EdgeListItem, PageEnvelope } from "$lib/api/envelope"
  import EmptyState from "$lib/components/common/EmptyState.svelte"
  import EdgesTable from "$lib/components/tables/EdgesTable.svelte"

  let { data } = $props()

  const LEAGUES = ["", "NBA", "NFL", "MLB", "NCAA_BB", "NCAA_FB", "NCAA_BSB"]
  const MARKETS = ["", "SPREAD", "TOTAL", "MONEYLINE"]
  type SortKey = "edge" | "ev" | "confidence" | "start"

  let sortKey = $state<SortKey>("edge")
  let extra = $state<EdgeListItem[]>([])
  let nextCursor = $state<string | null>(null)
  let loadingMore = $state(false)

  // Filter changes rerun the load; reset accumulated pages when it does.
  $effect(() => {
    void data.edges
    extra = []
    nextCursor = data.nextCursor
  })

  const sorters: Record<SortKey, (a: EdgeListItem, b: EdgeListItem) => number> = {
    edge: (a, b) => b.edge_percentage - a.edge_percentage,
    ev: (a, b) => b.expected_value - a.expected_value,
    confidence: (a, b) => (b.confidence ?? -1) - (a.confidence ?? -1),
    start: (a, b) => a.scheduled_start.localeCompare(b.scheduled_start)
  }

  const edges = $derived([...data.edges, ...extra].toSorted(sorters[sortKey]))

  function setParam(key: string, value: string): void {
    const params = new URLSearchParams(page.url.searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    goto(`/edges?${params}`, { keepFocus: true, noScroll: true })
  }

  async function loadMore(): Promise<void> {
    if (!nextCursor) return
    loadingMore = true
    try {
      const params = new URLSearchParams(page.url.searchParams)
      params.set("cursor", nextCursor)
      const response = await fetch(`/api/edges?${params}`)
      if (!response.ok) return
      const body = (await response.json()) as PageEnvelope<EdgeListItem>
      extra = [...extra, ...body.data]
      nextCursor = body.meta.pagination.next_cursor ?? null
    } finally {
      loadingMore = false
    }
  }
</script>

<svelte:head><title>Edges · BookieBreaker</title></svelte:head>

<h1 class="mb-4 text-2xl font-bold">Edges</h1>

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
  <label class="label">
    <span class="label-text text-xs">Min edge %</span>
    <input
      type="number"
      class="input w-28"
      min="0"
      step="0.5"
      value={page.url.searchParams.get("min_edge") ?? ""}
      onchange={(event) => setParam("min_edge", event.currentTarget.value)}
    />
  </label>
  <label class="label">
    <span class="label-text text-xs">Sort by</span>
    <select class="select w-40" bind:value={sortKey}>
      <option value="edge">Edge size</option>
      <option value="ev">Expected value</option>
      <option value="confidence">Confidence</option>
      <option value="start">Game time</option>
    </select>
  </label>
</div>

{#if edges.length === 0}
  <EmptyState
    title="No edges right now"
    message="Run the pipeline or loosen the filters to find edges."
  />
{:else}
  <EdgesTable {edges} />
  {#if nextCursor}
    <div class="mt-4 flex justify-center">
      <button type="button" class="btn preset-tonal" onclick={loadMore} disabled={loadingMore}>
        {loadingMore ? "Loading…" : "Load more"}
      </button>
    </div>
  {/if}
{/if}
