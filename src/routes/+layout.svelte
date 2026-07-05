<script lang="ts">
  import "../app.css"

  import { browser } from "$app/environment"

  import Header from "$lib/components/layout/Header.svelte"
  import LiveStatusDot from "$lib/components/layout/LiveStatusDot.svelte"
  import Nav from "$lib/components/layout/Nav.svelte"
  import Toasts from "$lib/components/layout/Toasts.svelte"
  import { liveEvents } from "$lib/stores/live-events.svelte"

  let { children } = $props()

  $effect(() => {
    if (!browser) return
    liveEvents.start()
    return () => liveEvents.stop()
  })
</script>

<div class="grid h-dvh grid-rows-[auto_1fr]">
  <Header>
    <LiveStatusDot />
  </Header>
  <div class="grid min-h-0 grid-cols-[auto_1fr]">
    <aside class="border-surface-200-800 border-r">
      <Nav />
    </aside>
    <main class="min-w-0 overflow-y-auto p-4 md:p-6">
      {@render children()}
    </main>
  </div>
</div>

<Toasts />
