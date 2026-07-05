<script lang="ts">
  import { invalidate } from "$app/navigation"

  import type { EdgeDetail, Envelope, BetData, PlaceBetRequest } from "$lib/api/envelope"
  import { deriveSide, type BetSide } from "$lib/utils/bet-side"
  import { formatAmerican } from "$lib/utils/format"
  import { newIdempotencyKey } from "$lib/utils/idempotency"

  let { edge = null }: { edge?: EdgeDetail | null } = $props()

  const SIDES: BetSide[] = ["HOME", "AWAY", "OVER", "UNDER"]

  // One key per form session, reused across retries of the same submission.
  const idempotencyKey = newIdempotencyKey()

  // The form seeds from the edge at mount; parents remount via {#key} when
  // the edge changes, so capturing the initial value here is intentional.
  // svelte-ignore state_referenced_locally
  const initial = edge

  let gameId = $state(initial?.game_id ?? "")
  let marketType = $state(initial?.market_type ?? "SPREAD")
  let selection = $state(initial?.selection ?? "")
  let side = $state<BetSide | "">(
    initial
      ? (deriveSide(
          initial.market_type,
          initial.selection,
          initial.game?.home_team.abbreviation,
          initial.game?.away_team.abbreviation
        ) ??
          deriveSide(
            initial.market_type,
            initial.selection,
            initial.game?.home_team.name,
            initial.game?.away_team.name
          ) ??
          "")
      : ""
  )
  let sportsbookKey = $state(initial?.sportsbook_key ?? "")
  let stake = $state(initial?.recommended_stake ?? 1)
  let predictedProbability = $state(initial?.predicted_probability ?? 0.55)
  let edgePercentage = $state(initial?.edge_percentage ?? 0)

  let submitting = $state(false)
  let outcome = $state<{ kind: "success" | "error"; message: string } | null>(null)

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    if (!side) {
      outcome = { kind: "error", message: "Pick a side for the bet." }
      return
    }
    submitting = true
    outcome = null
    const body: PlaceBetRequest = {
      game_id: gameId,
      game_external_id: edge?.game_external_id ?? null,
      edge_id: edge?.id ?? null,
      market_type: marketType as PlaceBetRequest["market_type"],
      selection,
      side,
      sportsbook_key: sportsbookKey || null,
      predicted_probability: predictedProbability,
      edge_percentage: edgePercentage,
      stake,
      kelly_fraction: edge?.kelly_fraction ?? null
    }
    try {
      const response = await fetch("/api/bets", {
        method: "POST",
        headers: { "content-type": "application/json", "X-Idempotency-Key": idempotencyKey },
        body: JSON.stringify(body)
      })
      const parsed = (await response.json()) as Envelope<BetData> & {
        error?: { message: string }
      }
      if (!response.ok) {
        outcome = { kind: "error", message: parsed.error?.message ?? "Bet placement failed" }
        return
      }
      outcome = {
        kind: "success",
        message: `Bet placed: ${parsed.data.selection} ${formatAmerican(parsed.data.odds_american)} for ${parsed.data.stake}u`
      }
      await invalidate("app:bets")
      await invalidate("app:dashboard")
    } catch {
      outcome = { kind: "error", message: "Bet placement failed — try again." }
    } finally {
      submitting = false
    }
  }
</script>

<form class="grid gap-3 sm:grid-cols-2" onsubmit={submit}>
  {#if edge}
    <p class="preset-tonal-primary col-span-full rounded p-2 text-sm">
      Betting edge <span class="font-mono">{edge.selection}</span> @ {edge.sportsbook_key}
      ({formatAmerican(edge.odds_american)}) — odds are re-captured at placement.
    </p>
  {:else}
    <label class="label">
      <span class="label-text text-xs">Game ID</span>
      <input class="input" bind:value={gameId} required placeholder="game UUID" />
    </label>
  {/if}
  <label class="label">
    <span class="label-text text-xs">Market</span>
    <select class="select" bind:value={marketType} disabled={edge !== null}>
      <option value="SPREAD">SPREAD</option>
      <option value="TOTAL">TOTAL</option>
      <option value="MONEYLINE">MONEYLINE</option>
    </select>
  </label>
  <label class="label">
    <span class="label-text text-xs">Selection</span>
    <input class="input" bind:value={selection} required disabled={edge !== null} />
  </label>
  <label class="label">
    <span class="label-text text-xs">Side</span>
    <select class="select" bind:value={side} required>
      <option value="" disabled>Choose…</option>
      {#each SIDES as option (option)}
        <option value={option}>{option}</option>
      {/each}
    </select>
  </label>
  <label class="label">
    <span class="label-text text-xs">Sportsbook (optional — best line if empty)</span>
    <input class="input" bind:value={sportsbookKey} placeholder="draftkings" />
  </label>
  <label class="label">
    <span class="label-text text-xs">Stake (units)</span>
    <input class="input" type="number" bind:value={stake} min="0.1" step="0.1" required />
  </label>
  {#if !edge}
    <label class="label">
      <span class="label-text text-xs">Predicted probability</span>
      <input
        class="input"
        type="number"
        bind:value={predictedProbability}
        min="0.01"
        max="0.99"
        step="0.001"
      />
    </label>
    <label class="label">
      <span class="label-text text-xs">Edge (% points)</span>
      <input class="input" type="number" bind:value={edgePercentage} step="0.1" />
    </label>
  {/if}
  <div class="col-span-full flex items-center gap-3">
    <button type="submit" class="btn preset-filled-primary-500" disabled={submitting}>
      {submitting ? "Placing…" : "Place paper bet"}
    </button>
    {#if outcome}
      <span class="text-sm {outcome.kind === 'success' ? 'text-success-500' : 'text-error-500'}">
        {outcome.message}
      </span>
    {/if}
  </div>
</form>
