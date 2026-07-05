<script lang="ts">
  let {
    label,
    value,
    detail = "",
    tone = "neutral"
  }: {
    label: string
    value: string
    detail?: string
    tone?: "neutral" | "positive" | "negative"
  } = $props()

  const toneClass = $derived(
    tone === "positive" ? "text-success-500" : tone === "negative" ? "text-error-500" : ""
  )
</script>

<div class="card preset-outlined-surface-200-800 flex flex-col gap-1 p-4">
  <span class="text-xs tracking-wide uppercase opacity-60">{label}</span>
  <span class="text-2xl font-bold {toneClass}">{value}</span>
  {#if detail}
    <span class="text-xs opacity-70">{detail}</span>
  {/if}
</div>
