<script lang="ts">
  import { invalidate } from "$app/navigation"

  import type {
    Envelope,
    ParlayDetailData,
    ParlayEvaluateRequest,
    ParlayEvaluationData,
    PlaceParlayRequest,
    ParlayPlaceLegRequest
  } from "$lib/api/envelope"
  import EmptyState from "$lib/components/common/EmptyState.svelte"
  import { sidesForMarket } from "$lib/utils/bet-side"
  import { formatAmerican, formatDateTime, formatLine, formatProbability } from "$lib/utils/format"
  import { newIdempotencyKey } from "$lib/utils/idempotency"
  import {
    addLeg,
    canEvaluate,
    legLabel,
    MAX_LEGS,
    MIN_LEGS,
    removeLeg,
    type ParlayLegDraft
  } from "$lib/utils/parlay"

  let { data } = $props()

  let legs = $state<ParlayLegDraft[]>([])
  let basketMessage = $state<string | null>(null)

  let evaluation = $state<ParlayEvaluationData | null>(null)
  let evaluating = $state(false)
  let evaluateError = $state<string | null>(null)

  // One key per evaluated parlay: retries of the same placement reuse it, a
  // re-evaluated basket gets a fresh one (mirrors the bet form's handling).
  let idempotencyKey = newIdempotencyKey()
  let stake = $state(1)
  let placing = $state(false)
  let placeError = $state<string | null>(null)
  let placed = $state<ParlayDetailData | null>(null)

  const MARKETS = ["SPREAD", "TOTAL", "MONEYLINE"]
  let manualGameId = $state("")
  let manualMarket = $state("SPREAD")
  let manualSide = $state("")
  let manualLine = $state("")
  let manualBook = $state("")
  const manualSides = $derived(sidesForMarket(manualMarket))
  $effect(() => {
    if (manualSide && !manualSides.includes(manualSide as never)) manualSide = ""
  })

  function resetOutcome(): void {
    evaluation = null
    evaluateError = null
    placeError = null
    placed = null
  }

  function add(leg: ParlayLegDraft): void {
    const result = addLeg(legs, leg)
    if (!result.ok) {
      basketMessage = result.error
      return
    }
    legs = result.legs
    basketMessage = null
    resetOutcome()
  }

  function addManual(event: SubmitEvent): void {
    event.preventDefault()
    if (!manualGameId.trim() || !manualSide) {
      basketMessage = "A manual leg needs a game id and a side."
      return
    }
    add({
      game_external_id: manualGameId.trim(),
      market_type: manualMarket,
      side: manualSide,
      selection: null,
      line_value: manualLine === "" ? null : Number(manualLine),
      sportsbook_key: manualBook.trim() || null,
      league: null,
      edge_id: null
    })
  }

  function remove(index: number): void {
    legs = removeLeg(legs, index)
    basketMessage = null
    resetOutcome()
  }

  async function evaluate(): Promise<void> {
    if (!canEvaluate(legs)) return
    evaluating = true
    evaluateError = null
    placeError = null
    placed = null
    const body: ParlayEvaluateRequest = {
      legs: legs.map((leg) => ({
        game_external_id: leg.game_external_id,
        market_type: leg.market_type,
        side: leg.side,
        line_value: leg.line_value,
        sportsbook_key: leg.sportsbook_key
      })),
      persist: false
    }
    try {
      const response = await fetch("/api/parlays/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      })
      const parsed = (await response.json()) as Envelope<ParlayEvaluationData> & {
        error?: { message: string }
      }
      if (!response.ok) {
        evaluateError = parsed.error?.message ?? "Parlay evaluation failed"
        return
      }
      evaluation = parsed.data
      stake = parsed.data.recommended_stake
      idempotencyKey = newIdempotencyKey()
    } catch {
      evaluateError = "Parlay evaluation failed — try again."
    } finally {
      evaluating = false
    }
  }

  async function place(): Promise<void> {
    if (!evaluation) return
    placing = true
    placeError = null
    const body: PlaceParlayRequest = {
      legs: evaluation.legs.map((leg): ParlayPlaceLegRequest => ({
        game_id: leg.game_id,
        game_external_id: leg.game_external_id,
        market_type: leg.market_type as ParlayPlaceLegRequest["market_type"],
        side: leg.side as ParlayPlaceLegRequest["side"],
        selection: leg.selection,
        line_value: leg.line_value,
        sportsbook_key: leg.sportsbook_key
      })),
      stake,
      predicted_probability: evaluation.joint_probability,
      // Edge vs the combined price, in points (joint - implied).
      edge_percentage: (evaluation.joint_probability - 1 / evaluation.combined_odds_decimal) * 100,
      kelly_fraction: evaluation.kelly_fraction,
      reasoning: null
    }
    try {
      const response = await fetch("/api/parlays/place", {
        method: "POST",
        headers: { "content-type": "application/json", "X-Idempotency-Key": idempotencyKey },
        body: JSON.stringify(body)
      })
      const parsed = (await response.json()) as Envelope<ParlayDetailData> & {
        error?: { message: string }
      }
      if (!response.ok) {
        placeError = parsed.error?.message ?? "Parlay placement failed"
        return
      }
      placed = parsed.data
      await invalidate("app:bets")
    } catch {
      placeError = "Parlay placement failed — try again."
    } finally {
      placing = false
    }
  }
</script>

<svelte:head><title>Parlay · BookieBreaker</title></svelte:head>

<h1 class="mb-1 text-2xl font-bold">Parlay builder</h1>
<p class="mb-4 text-sm opacity-70">
  Combine {MIN_LEGS}–{MAX_LEGS} team-market legs from one league, evaluate the correlation-aware joint
  probability, then place it as a paper parlay.
</p>

<div class="grid gap-6 lg:grid-cols-2">
  <div class="flex flex-col gap-6">
    <section class="card preset-outlined-surface-200-800 p-4">
      <h2 class="mb-3 font-semibold">Legs from detected edges</h2>
      {#if data.edgeLegs.length === 0}
        <EmptyState
          title="No fresh team-market edges"
          message="Run the pipeline or add legs manually below."
        />
      {:else}
        <div class="overflow-x-auto">
          <table class="table w-full text-sm">
            <thead>
              <tr class="text-left opacity-60">
                <th class="p-2">Selection</th>
                <th class="p-2">Matchup</th>
                <th class="p-2">Market</th>
                <th class="p-2 text-right">Odds</th>
                <th class="p-2 text-right">Edge</th>
                <th class="p-2"><span class="sr-only">Add</span></th>
              </tr>
            </thead>
            <tbody>
              {#each data.edgeLegs as option (option.leg.edge_id)}
                <tr class="hover:preset-tonal border-surface-200-800 border-t">
                  <td class="p-2 font-medium whitespace-nowrap">{option.leg.selection}</td>
                  <td class="p-2 whitespace-nowrap">
                    {option.leg.league} · {option.matchup}
                    <span class="block text-xs opacity-60">
                      {formatDateTime(option.scheduled_start)}
                    </span>
                  </td>
                  <td class="p-2">{option.leg.market_type} {option.leg.side}</td>
                  <td class="p-2 text-right font-mono">{formatAmerican(option.odds_american)}</td>
                  <td class="p-2 text-right font-mono">+{option.edge_percentage.toFixed(2)}%</td>
                  <td class="p-2 text-right">
                    <button
                      type="button"
                      class="btn btn-sm preset-tonal-primary"
                      aria-label="Add {legLabel(option.leg)} to parlay"
                      onclick={() => add({ ...option.leg })}
                    >
                      Add
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>

    <section class="card preset-outlined-surface-200-800 p-4">
      <h2 class="mb-3 font-semibold">Manual leg</h2>
      <form class="grid gap-3 sm:grid-cols-2" onsubmit={addManual}>
        <label class="label">
          <span class="label-text text-xs">Game external ID</span>
          <input class="input" bind:value={manualGameId} placeholder="odds-api game id" />
        </label>
        <label class="label">
          <span class="label-text text-xs">Market</span>
          <select class="select" bind:value={manualMarket}>
            {#each MARKETS as market (market)}
              <option value={market}>{market}</option>
            {/each}
          </select>
        </label>
        <label class="label">
          <span class="label-text text-xs">Side</span>
          <select class="select" bind:value={manualSide}>
            <option value="" disabled>Choose…</option>
            {#each manualSides as option (option)}
              <option value={option}>{option}</option>
            {/each}
          </select>
        </label>
        <label class="label">
          <span class="label-text text-xs">Line (optional)</span>
          <input class="input" type="number" step="0.5" bind:value={manualLine} />
        </label>
        <label class="label">
          <span class="label-text text-xs">Sportsbook (optional — best line if empty)</span>
          <input class="input" bind:value={manualBook} placeholder="draftkings" />
        </label>
        <div class="flex items-end">
          <button type="submit" class="btn preset-tonal-primary">Add manual leg</button>
        </div>
      </form>
    </section>
  </div>

  <div class="flex flex-col gap-6">
    <section class="card preset-outlined-surface-200-800 p-4">
      <h2 class="mb-3 font-semibold">
        Basket <span class="opacity-60">({legs.length}/{MAX_LEGS})</span>
      </h2>
      {#if basketMessage}
        <p class="preset-tonal-warning mb-3 rounded p-2 text-sm" role="alert">{basketMessage}</p>
      {/if}
      {#if legs.length === 0}
        <p class="text-sm opacity-70">
          Add {MIN_LEGS}–{MAX_LEGS} legs from one league to evaluate a parlay.
        </p>
      {:else}
        <ul class="divide-surface-200-800 divide-y">
          {#each legs as leg, index (`${leg.game_external_id}|${leg.market_type}|${leg.side}`)}
            <li class="flex items-center justify-between gap-3 py-2">
              <div>
                <span class="text-sm font-medium">{legLabel(leg)}</span>
                <span class="block text-xs opacity-60">
                  {leg.league ?? "league TBD"} · {leg.game_external_id} · {leg.market_type}
                  {leg.side}
                  {#if leg.line_value !== null}
                    · line {formatLine(leg.line_value)}
                  {/if}
                </span>
              </div>
              <button
                type="button"
                class="btn btn-sm hover:preset-tonal"
                aria-label="Remove {legLabel(leg)} from parlay"
                onclick={() => remove(index)}
              >
                Remove
              </button>
            </li>
          {/each}
        </ul>
      {/if}
      <div class="mt-4 flex items-center gap-3">
        <button
          type="button"
          class="btn preset-filled-primary-500"
          disabled={!canEvaluate(legs) || evaluating}
          onclick={evaluate}
        >
          {evaluating ? "Evaluating…" : "Evaluate"}
        </button>
        {#if legs.length > 0 && !canEvaluate(legs)}
          <span class="text-sm opacity-70">Needs at least {MIN_LEGS} legs.</span>
        {/if}
        {#if evaluateError}
          <span class="text-error-500 text-sm">{evaluateError}</span>
        {/if}
      </div>
    </section>

    {#if evaluation}
      <section class="card preset-outlined-surface-200-800 p-4" data-testid="parlay-evaluation">
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <h2 class="font-semibold">Evaluation</h2>
          <span class="badge preset-tonal text-xs" data-testid="method-badge">
            {evaluation.method}
          </span>
          {#if evaluation.is_same_game}
            <span class="badge preset-tonal-primary text-xs">same game</span>
          {/if}
          <span
            class="badge text-xs {evaluation.meets_threshold
              ? 'preset-tonal-success'
              : 'preset-tonal-warning'}"
            data-testid="threshold-state"
          >
            {evaluation.meets_threshold ? "Meets threshold" : "Below threshold"}
          </span>
        </div>

        <dl class="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt class="text-xs opacity-60">Joint probability</dt>
            <dd class="font-mono" data-testid="joint-probability">
              {formatProbability(evaluation.joint_probability)}
            </dd>
          </div>
          <div>
            <dt class="text-xs opacity-60">If independent</dt>
            <dd class="font-mono" data-testid="independent-probability">
              {formatProbability(evaluation.independent_probability)}
            </dd>
          </div>
          <div>
            <dt class="text-xs opacity-60">Correlation edge</dt>
            <dd
              class="font-mono {evaluation.correlation_edge > 0 ? 'text-success-500' : ''}"
              data-testid="correlation-edge"
            >
              {evaluation.correlation_edge > 0 ? "+" : ""}{formatProbability(
                evaluation.correlation_edge
              )}
            </dd>
          </div>
          <div>
            <dt class="text-xs opacity-60">Combined odds</dt>
            <dd class="font-mono" data-testid="combined-odds">
              {formatAmerican(evaluation.combined_odds_american)}
              ({evaluation.combined_odds_decimal.toFixed(2)})
            </dd>
          </div>
          <div>
            <dt class="text-xs opacity-60">EV</dt>
            <dd class="font-mono" data-testid="ev-pct">
              {evaluation.ev_pct > 0 ? "+" : ""}{evaluation.ev_pct.toFixed(2)}%
            </dd>
          </div>
          <div>
            <dt class="text-xs opacity-60">Recommended stake</dt>
            <dd class="font-mono" data-testid="recommended-stake">
              {evaluation.recommended_stake.toFixed(2)}u (kelly {evaluation.kelly_fraction.toFixed(
                3
              )})
            </dd>
          </div>
        </dl>

        {#if Object.keys(evaluation.correlations).length > 0}
          <div class="mt-3 flex flex-wrap gap-2" data-testid="correlation-chips">
            {#each Object.entries(evaluation.correlations) as [pair, rho] (pair)}
              <span class="badge preset-tonal text-xs font-mono">
                ρ {pair}: {rho.toFixed(2)}
              </span>
            {/each}
          </div>
        {/if}

        <div class="mt-4 flex flex-wrap items-center gap-3">
          <label class="label w-32">
            <span class="label-text text-xs">Stake (units)</span>
            <input class="input" type="number" bind:value={stake} min="0.1" step="0.1" />
          </label>
          <button
            type="button"
            class="btn preset-filled-primary-500"
            disabled={placing || placed !== null}
            onclick={place}
          >
            {placing ? "Placing…" : "Place parlay"}
          </button>
          {#if placed}
            <span class="text-success-500 text-sm" data-testid="parlay-placed">
              Parlay placed: {placed.selection}
              {formatAmerican(placed.combined_odds_american)} for {placed.stake}u —
              <a href="/bets/{placed.id}" class="anchor">view in ledger</a>
            </span>
          {/if}
          {#if placeError}
            <span class="text-error-500 text-sm">{placeError}</span>
          {/if}
        </div>
      </section>
    {/if}
  </div>
</div>
