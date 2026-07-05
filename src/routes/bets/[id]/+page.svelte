<script lang="ts">
  import StatCard from "$lib/components/common/StatCard.svelte"
  import { formatAmerican, formatDateTime, formatProbability, formatUnits } from "$lib/utils/format"

  let { data } = $props()

  const bet = $derived(data.bet)
</script>

<svelte:head><title>{bet.selection} · Bets · BookieBreaker</title></svelte:head>

<div class="mb-4">
  <a href="/bets" class="anchor text-sm">← Ledger</a>
  <h1 class="mt-1 text-2xl font-bold">
    {bet.selection}
    <span class="badge preset-tonal ml-2 align-middle text-sm">{bet.result}</span>
  </h1>
  <p class="text-sm opacity-70">
    {bet.market_type} · {bet.side} · {bet.sportsbook_key} · placed {formatDateTime(bet.placed_at)}
    {#if bet.edge_id}
      · <a href="/edges/{bet.edge_id}" class="anchor">source edge</a>
    {/if}
  </p>
</div>

<div class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
  <StatCard
    label="Stake"
    value={`${bet.stake.toFixed(2)}u`}
    detail={`$${bet.stake_dollars.toFixed(2)} at ${formatAmerican(bet.odds_american)}`}
  />
  <StatCard
    label="Profit / loss"
    value={bet.profit_loss === null ? "pending" : formatUnits(bet.profit_loss)}
    tone={bet.profit_loss === null ? "neutral" : bet.profit_loss >= 0 ? "positive" : "negative"}
    detail={bet.graded_at ? `graded ${formatDateTime(bet.graded_at)}` : "awaiting final score"}
  />
  <StatCard
    label="Model probability"
    value={formatProbability(bet.predicted_probability)}
    detail={`edge at placement ${bet.edge_percentage.toFixed(2)}%`}
  />
  <StatCard
    label="CLV"
    value={bet.clv === null ? "—" : formatProbability(bet.clv, 2)}
    tone={bet.clv !== null && bet.clv > 0 ? "positive" : "neutral"}
    detail={bet.closing_odds_american
      ? `closed ${formatAmerican(bet.closing_odds_american)}`
      : "no closing line captured"}
  />
</div>

{#if bet.grade}
  <section class="card preset-outlined-surface-200-800 p-4">
    <h2 class="mb-2 font-semibold">Grade</h2>
    <p class="text-sm">{bet.grade.result_description}</p>
    <p class="mt-1 text-sm opacity-70">
      Final: {bet.grade.actual_away_score}–{bet.grade.actual_home_score}
      (margin {bet.grade.actual_margin}, total {bet.grade.actual_total})
    </p>
  </section>
{/if}
