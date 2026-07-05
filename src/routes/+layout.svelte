<script lang="ts">
  import "../app.css"

  import Header from "$lib/components/layout/Header.svelte"
  import Nav from "$lib/components/layout/Nav.svelte"

  let { children } = $props()
</script>

<div class="grid h-dvh grid-rows-[auto_1fr]">
  <Header />
  <div class="grid min-h-0 grid-cols-[auto_1fr]">
    <aside class="border-surface-200-800 border-r">
      <Nav />
    </aside>
    <main class="min-w-0 overflow-y-auto p-4 md:p-6">
      {@render children()}
    </main>
  </div>
</div>
