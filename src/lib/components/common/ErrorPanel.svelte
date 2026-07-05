<script lang="ts">
  let {
    title = "Something went wrong",
    message = "A backend service is unavailable. Try again shortly."
  }: {
    title?: string
    message?: string
  } = $props()
</script>

<div class="card preset-tonal-error flex flex-col items-center gap-2 p-8 text-center">
  <p class="font-semibold">{title}</p>
  <p class="text-sm opacity-80">{message}</p>
</div>
