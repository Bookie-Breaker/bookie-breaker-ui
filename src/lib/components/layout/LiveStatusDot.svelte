<script lang="ts">
  import { liveEvents } from "$lib/stores/live-events.svelte"

  const color = $derived(
    liveEvents.status === "connected"
      ? "bg-success-500"
      : liveEvents.status === "connecting"
        ? "bg-warning-500"
        : "bg-error-500"
  )
</script>

<span
  class="flex items-center gap-1.5 text-xs opacity-70"
  title="Live updates: {liveEvents.status}"
>
  <span class="size-2 rounded-full {color}"></span>
  <span class="hidden sm:inline">live</span>
</span>
