<script lang="ts">
  import { MoonIcon, SunIcon } from "@lucide/svelte"

  import { preferences } from "$lib/stores/preferences.svelte"
</script>

<button
  type="button"
  class="btn-icon hover:preset-tonal"
  onclick={() => preferences.toggleMode()}
  aria-label="Toggle dark mode"
  title="Toggle dark mode"
>
  {#if preferences.mode === "dark"}
    <SunIcon class="size-5" />
  {:else}
    <MoonIcon class="size-5" />
  {/if}
</button>
