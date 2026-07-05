<script lang="ts">
  import { MessageSquareTextIcon } from "@lucide/svelte"

  import { chat } from "$lib/stores/chat.svelte"
</script>

<button
  type="button"
  class="btn-icon {chat.open ? 'preset-filled-primary-500' : 'hover:preset-tonal'}"
  onclick={() => chat.toggle()}
  aria-label="Toggle analyst chat"
  title="Analyst chat"
>
  <MessageSquareTextIcon class="size-5" />
</button>
