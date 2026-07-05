<script lang="ts">
  import { formatPoints } from "$lib/utils/format"

  let { points }: { points: number } = $props()

  const tone = $derived(
    points >= 5
      ? "preset-filled-success-500"
      : points >= 3
        ? "preset-tonal-success"
        : "preset-tonal"
  )
</script>

<span class="badge {tone} font-mono">{formatPoints(points, { signed: true })}</span>
