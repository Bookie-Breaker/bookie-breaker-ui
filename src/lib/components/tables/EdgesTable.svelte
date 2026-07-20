<script lang="ts">
  import type { EdgeListItem } from "$lib/api/envelope"
  import EdgeBadge from "$lib/components/common/EdgeBadge.svelte"
  import { formatAmerican, formatDateTime, formatProbability } from "$lib/utils/format"
  import { isPlayerProp, propView, type PropEdgeFields, type PropSide } from "$lib/utils/props"

  let { edges }: { edges: EdgeListItem[] } = $props()

  function sideClass(side: PropSide): string {
    if (side === "YES") return "preset-tonal-success"
    if (side === "NO") return "preset-tonal-error"
    return "preset-tonal"
  }
</script>

<div class="table-wrap overflow-x-auto">
  <table class="table w-full text-sm">
    <thead>
      <tr class="text-left opacity-60">
        <th class="p-2">Matchup</th>
        <th class="p-2">Selection</th>
        <th class="p-2">Book</th>
        <th class="p-2 text-right">Odds</th>
        <th class="p-2 text-right">Edge</th>
        <th class="p-2 text-right">EV</th>
        <th class="p-2 text-right">Model</th>
        <th class="p-2 text-right">Conf.</th>
        <th class="p-2 text-right">Stake</th>
        <th class="p-2">Game time</th>
        <th class="p-2"></th>
      </tr>
    </thead>
    <tbody>
      {#each edges as edge (edge.id)}
        <tr class="hover:preset-tonal border-surface-200-800 border-t">
          <td class="p-2 whitespace-nowrap">
            <a href="/edges/{edge.id}" class="anchor font-medium">
              {edge.away_team ?? "?"} @ {edge.home_team ?? "?"}
            </a>
            <span class="ml-1 text-xs opacity-60">{edge.league}</span>
          </td>
          <td class="p-2 whitespace-nowrap">
            {#if isPlayerProp(edge)}
              {@const prop = propView(edge as EdgeListItem & PropEdgeFields)}
              <span class="badge preset-tonal mr-1 text-xs">PROP</span>
              <span class="font-medium">{prop.player}</span>
              {#if prop.side}
                <span class="badge {sideClass(prop.side)} ml-1 text-xs">{prop.side}</span>
              {/if}
              {#if prop.line !== null}
                <span class="ml-1 font-mono">{prop.line}</span>
              {/if}
              <div class="text-xs opacity-60">{prop.statLabel ?? "Player prop"}</div>
            {:else}
              <span class="badge preset-tonal mr-1 text-xs">{edge.market_type}</span>
              {edge.selection}
            {/if}
          </td>
          <td class="p-2">{edge.sportsbook_key}</td>
          <td class="p-2 text-right font-mono">{formatAmerican(edge.odds_american)}</td>
          <td class="p-2 text-right"><EdgeBadge points={edge.edge_percentage} /></td>
          <td class="p-2 text-right font-mono">{edge.expected_value.toFixed(3)}</td>
          <td class="p-2 text-right font-mono">{formatProbability(edge.predicted_probability)}</td>
          <td class="p-2 text-right font-mono">
            {edge.confidence === null ? "—" : formatProbability(edge.confidence, 0)}
          </td>
          <td class="p-2 text-right font-mono">{edge.recommended_stake.toFixed(2)}u</td>
          <td class="p-2 whitespace-nowrap">{formatDateTime(edge.scheduled_start)}</td>
          <td class="p-2 whitespace-nowrap">
            {#if edge.is_stale}
              <span class="badge preset-tonal-warning text-xs">stale</span>
            {/if}
            {#if edge.has_paper_bet}
              <span class="badge preset-tonal-primary text-xs">bet placed</span>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
