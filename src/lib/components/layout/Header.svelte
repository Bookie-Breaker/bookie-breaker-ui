<script lang="ts">
  import ThemeToggle from "$lib/components/layout/ThemeToggle.svelte"

  let { children = undefined }: { children?: import("svelte").Snippet } = $props()
</script>

<header class="border-surface-200-800 flex items-center justify-between gap-4 border-b px-4 py-2">
  <a href="/" class="flex items-center gap-2">
    <img src="/favicon.svg" alt="" class="size-6" />
    <span class="text-lg font-bold tracking-tight">BookieBreaker</span>
  </a>
  <div class="flex items-center gap-1">
    {#if children}
      {@render children()}
    {/if}
    <ThemeToggle />
  </div>
</header>
