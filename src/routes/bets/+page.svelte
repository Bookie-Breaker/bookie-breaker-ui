<script lang="ts">
  import { goto } from "$app/navigation"
  import { page } from "$app/state"

  import type { BetData, PageEnvelope } from "$lib/api/envelope"
  import BetForm from "$lib/components/bets/BetForm.svelte"
  import EmptyState from "$lib/components/common/EmptyState.svelte"
  import { formatAmerican, formatDateTime, formatProbability, formatUnits } from "$lib/utils/format"

  let { data } = $props()

  const RESULTS = ["", "PENDING", "WIN", "LOSS", "PUSH", "VOID"]

  let extra = $state<BetData[]>([])
  let nextCursor = $state<string | null>(null)
  let loadingMore = $state(false)
  let showForm = $state(false)

  $effect(() => {
    void data.bets
    extra = []
    nextCursor = data.nextCursor
    if (data.prefillEdge) showForm = true
  })

  const bets = $derived([...data.bets, ...extra])

  function resultClass(result: BetData["result"]): string {
    if (result === "WIN") return "preset-tonal-success"
    if (result === "LOSS") return "preset-tonal-error"
    if (result === "PENDING") return "preset-tonal"
    return "preset-tonal-warning"
  }

  function setParam(key: string, value: string): void {
    const params = new URLSearchParams(page.url.searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    goto(`/bets?${params}`, { keepFocus: true, noScroll: true })
  }

  async function loadMore(): Promise<void> {
    if (!nextCursor) return
    loadingMore = true
    try {
      const params = new URLSearchParams(page.url.searchParams)
      params.delete("edge")
      params.set("cursor", nextCursor)
      const response = await fetch(`/api/bets?${params}`)
      if (!response.ok) return
      const body = (await response.json()) as PageEnvelope<BetData>
      extra = [...extra, ...body.data]
      nextCursor = body.meta.pagination.next_cursor ?? null
    } finally {
      loadingMore = false
    }
  }
</script>

<svelte:head><title>Bets · BookieBreaker</title></svelte:head>

<div class="mb-4 flex items-center justify-between">
  <h1 class="text-2xl font-bold">Bet ledger</h1>
  <button
    type="button"
    class="btn preset-filled-primary-500"
    onclick={() => (showForm = !showForm)}
  >
    {showForm ? "Hide form" : "Place a bet"}
  </button>
</div>

{#if showForm}
  <section class="card preset-outlined-surface-200-800 mb-6 p-4">
    <h2 class="mb-3 font-semibold">
      {data.prefillEdge ? "Bet this edge" : "Place a paper bet"}
    </h2>
    {#key data.prefillEdge?.id}
      <BetForm edge={data.prefillEdge} />
    {/key}
  </section>
{/if}

<div class="mb-4 flex flex-wrap items-end gap-3">
  <label class="label">
    <span class="label-text text-xs">Result</span>
    <select
      class="select w-32"
      value={page.url.searchParams.get("result") ?? ""}
      onchange={(event) => setParam("result", event.currentTarget.value)}
    >
      {#each RESULTS as result (result)}
        <option value={result}>{result || "All"}</option>
      {/each}
    </select>
  </label>
  <label class="label">
    <span class="label-text text-xs">Status</span>
    <select
      class="select w-32"
      value={page.url.searchParams.get("status") ?? ""}
      onchange={(event) => setParam("status", event.currentTarget.value)}
    >
      <option value="">All</option>
      <option value="open">Open</option>
      <option value="graded">Graded</option>
    </select>
  </label>
  <label class="label">
    <span class="label-text text-xs">Market</span>
    <select
      class="select w-36"
      value={page.url.searchParams.get("market_type") ?? ""}
      onchange={(event) => setParam("market_type", event.currentTarget.value)}
    >
      <option value="">All</option>
      <option value="SPREAD">SPREAD</option>
      <option value="TOTAL">TOTAL</option>
      <option value="MONEYLINE">MONEYLINE</option>
    </select>
  </label>
</div>

{#if bets.length === 0}
  <EmptyState title="No bets yet" message="Edges you bet appear here with grades and CLV." />
{:else}
  <div class="overflow-x-auto">
    <table class="table w-full text-sm">
      <thead>
        <tr class="text-left opacity-60">
          <th class="p-2">Selection</th>
          <th class="p-2">Market</th>
          <th class="p-2">Book</th>
          <th class="p-2 text-right">Odds</th>
          <th class="p-2 text-right">Stake</th>
          <th class="p-2 text-right">Model</th>
          <th class="p-2">Result</th>
          <th class="p-2 text-right">P/L</th>
          <th class="p-2 text-right">CLV</th>
          <th class="p-2">Placed</th>
        </tr>
      </thead>
      <tbody>
        {#each bets as bet (bet.id)}
          <tr class="hover:preset-tonal border-surface-200-800 border-t">
            <td class="p-2 whitespace-nowrap">
              <a href="/bets/{bet.id}" class="anchor font-medium">{bet.selection}</a>
            </td>
            <td class="p-2">{bet.market_type}</td>
            <td class="p-2">{bet.sportsbook_key}</td>
            <td class="p-2 text-right font-mono">{formatAmerican(bet.odds_american)}</td>
            <td class="p-2 text-right font-mono">{bet.stake.toFixed(2)}u</td>
            <td class="p-2 text-right font-mono">
              {formatProbability(bet.predicted_probability)}
            </td>
            <td class="p-2">
              <span class="badge {resultClass(bet.result)} text-xs">{bet.result}</span>
            </td>
            <td class="p-2 text-right font-mono">
              {bet.profit_loss === null ? "—" : formatUnits(bet.profit_loss)}
            </td>
            <td class="p-2 text-right font-mono">
              {bet.clv === null ? "—" : formatProbability(bet.clv, 2)}
            </td>
            <td class="p-2 whitespace-nowrap">{formatDateTime(bet.placed_at)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  {#if nextCursor}
    <div class="mt-4 flex justify-center">
      <button type="button" class="btn preset-tonal" onclick={loadMore} disabled={loadingMore}>
        {loadingMore ? "Loading…" : "Load more"}
      </button>
    </div>
  {/if}
{/if}
