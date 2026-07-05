<script lang="ts">
  import { toasts } from "$lib/stores/toasts.svelte"

  function toneClass(tone: string): string {
    if (tone === "success") return "preset-filled-success-500"
    if (tone === "error") return "preset-filled-error-500"
    return "preset-filled-surface-100-900"
  }
</script>

<div class="fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2" aria-live="polite">
  {#each toasts.items as toast (toast.id)}
    <div class="card {toneClass(toast.tone)} flex items-center justify-between gap-2 p-3 shadow-lg">
      <span class="text-sm">
        {toast.message}
        {#if toast.href}
          <a href={toast.href} class="anchor ml-1 text-xs" onclick={() => toasts.dismiss(toast.id)}>
            view
          </a>
        {/if}
      </span>
      <button
        type="button"
        class="btn-icon btn-icon-sm opacity-70"
        aria-label="Dismiss"
        onclick={() => toasts.dismiss(toast.id)}
      >
        ×
      </button>
    </div>
  {/each}
</div>
