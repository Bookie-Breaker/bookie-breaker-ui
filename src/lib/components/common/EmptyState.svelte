<script lang="ts">
  let {
    title = "Nothing here yet",
    message = ""
  }: {
    title?: string
    message?: string
  } = $props()
</script>

<div class="card preset-tonal flex flex-col items-center gap-2 p-8 text-center">
  <p class="font-semibold">{title}</p>
  {#if message}
    <p class="text-sm opacity-70">{message}</p>
  {/if}
</div>
