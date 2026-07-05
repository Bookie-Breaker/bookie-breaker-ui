<script lang="ts">
  import { SendIcon, XIcon } from "@lucide/svelte"

  import Markdown from "$lib/components/common/Markdown.svelte"
  import { chat } from "$lib/stores/chat.svelte"
  import { pageContext } from "$lib/stores/page-context.svelte"

  let question = $state("")
  let scroller = $state<HTMLDivElement>()

  const contextLabel = $derived.by(() => {
    const context = pageContext.current
    if (context.type === "edge") return `Asking about edge: ${context.label}`
    if (context.type === "game") return `Asking about game: ${context.label}`
    if (context.type === "performance") return "Asking about performance"
    return "Asking about performance (default)"
  })

  $effect(() => {
    void chat.messages
    scroller?.scrollTo({ top: scroller.scrollHeight })
  })

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    const value = question
    question = ""
    await chat.send(value)
  }
</script>

{#if chat.open}
  <aside
    class="bg-surface-50-950 border-surface-200-800 fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l shadow-xl lg:static lg:z-auto lg:w-[350px] lg:shadow-none"
    aria-label="Analyst chat"
  >
    <div class="border-surface-200-800 flex items-center justify-between border-b px-3 py-2">
      <div>
        <p class="font-semibold">Analyst</p>
        <p class="text-xs opacity-60">{contextLabel}</p>
      </div>
      <button
        type="button"
        class="btn-icon hover:preset-tonal"
        aria-label="Close chat"
        onclick={() => chat.toggle()}
      >
        <XIcon class="size-5" />
      </button>
    </div>

    <div bind:this={scroller} class="flex-1 space-y-3 overflow-y-auto p-3">
      {#if chat.messages.length === 0}
        <p class="text-sm opacity-60">
          Ask about the edge or game you're viewing — "Why do you like the over here?" — or about
          overall performance.
        </p>
      {/if}
      {#each chat.messages as message, index (index)}
        {#if message.role === "user"}
          <div class="preset-tonal-primary ml-6 rounded-lg p-2 text-sm">{message.content}</div>
        {:else}
          <div
            class="mr-2 rounded-lg p-2 text-sm {message.error
              ? 'preset-tonal-error'
              : 'preset-tonal'}"
          >
            {#if message.content}
              <Markdown content={message.content} />
            {:else if message.streaming}
              <span class="animate-pulse">Thinking…</span>
            {/if}
            {#if message.streaming && message.content}
              <span class="animate-pulse">▌</span>
            {/if}
            {#if message.cached}
              <p class="mt-1 text-xs opacity-50">cached analysis</p>
            {/if}
          </div>
        {/if}
      {/each}
    </div>

    <form class="border-surface-200-800 flex gap-2 border-t p-3" onsubmit={submit}>
      <input
        class="input flex-1"
        placeholder="Ask the analyst…"
        maxlength="2000"
        bind:value={question}
        disabled={chat.busy}
      />
      <button
        type="submit"
        class="btn-icon preset-filled-primary-500"
        disabled={chat.busy || !question.trim()}
        aria-label="Send"
      >
        <SendIcon class="size-4" />
      </button>
    </form>
  </aside>
{/if}
