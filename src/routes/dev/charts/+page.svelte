<script lang="ts">
  import { dev } from "$app/environment"
  import { error } from "@sveltejs/kit"

  import Chart from "$lib/components/charts/Chart.svelte"
  import { breakdownOption } from "$lib/charts/breakdown"
  import { calibrationOption } from "$lib/charts/calibration"
  import { distributionOption } from "$lib/charts/distribution"
  import { featureImportanceOption } from "$lib/charts/feature-importance"
  import {
    bankrollHistoryFixture,
    breakdownFixture,
    calibrationFixture,
    distributionFixture,
    featureImportanceFixture,
    lineMovementFixture
  } from "$lib/charts/fixtures"
  import { lineMovementOption } from "$lib/charts/line-movement"
  import { roiOption } from "$lib/charts/roi"
  import { chartTheme } from "$lib/charts/theme"
  import { winRateClvOption } from "$lib/charts/win-rate-clv"
  import { preferences } from "$lib/stores/preferences.svelte"

  if (!dev) {
    error(404, "Not found")
  }

  const theme = $derived(chartTheme(preferences.mode))
</script>

<h1 class="mb-4 text-2xl font-bold">Chart playground</h1>
<p class="mb-6 text-sm opacity-70">Dev-only: every option builder rendered against fixtures.</p>

<div class="grid gap-6 xl:grid-cols-2">
  <section class="card preset-outlined-surface-200-800 p-4">
    <h2 class="mb-2 font-semibold">Line movement</h2>
    <Chart option={lineMovementOption(lineMovementFixture, theme)} ariaLabel="line movement" />
  </section>
  <section class="card preset-outlined-surface-200-800 p-4">
    <h2 class="mb-2 font-semibold">Feature importance</h2>
    <Chart
      option={featureImportanceOption(featureImportanceFixture, theme)}
      ariaLabel="feature importance"
    />
  </section>
  <section class="card preset-outlined-surface-200-800 p-4">
    <h2 class="mb-2 font-semibold">Margin distribution</h2>
    <Chart
      option={distributionOption(distributionFixture, theme, { marketLine: -3.5, name: "margin" })}
      ariaLabel="margin distribution"
    />
  </section>
  <section class="card preset-outlined-surface-200-800 p-4">
    <h2 class="mb-2 font-semibold">Bankroll / ROI</h2>
    <Chart option={roiOption(bankrollHistoryFixture, theme)} ariaLabel="bankroll and roi" />
  </section>
  <section class="card preset-outlined-surface-200-800 p-4">
    <h2 class="mb-2 font-semibold">Win rate / CLV</h2>
    <Chart option={winRateClvOption(bankrollHistoryFixture, theme)} ariaLabel="win rate and clv" />
  </section>
  <section class="card preset-outlined-surface-200-800 p-4">
    <h2 class="mb-2 font-semibold">Calibration</h2>
    <Chart option={calibrationOption(calibrationFixture, theme)} ariaLabel="calibration plot" />
  </section>
  <section class="card preset-outlined-surface-200-800 p-4">
    <h2 class="mb-2 font-semibold">Breakdown</h2>
    <Chart option={breakdownOption(breakdownFixture, theme)} ariaLabel="performance breakdown" />
  </section>
</div>
