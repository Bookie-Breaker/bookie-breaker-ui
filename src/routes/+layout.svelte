<script lang="ts">
  import "../app.css"

  import { browser } from "$app/environment"

  import ChatSidebar from "$lib/components/chat/ChatSidebar.svelte"
  import ChatToggle from "$lib/components/layout/ChatToggle.svelte"
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
    <ChatToggle />
  </Header>
  <div class="grid min-h-0 grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_auto]">
    <aside class="border-surface-200-800 border-r">
      <Nav />
    </aside>
    <main class="min-w-0 overflow-y-auto p-4 md:p-6">
      {@render children()}
    </main>
    <ChatSidebar />
  </div>
</div>

<Toasts />
