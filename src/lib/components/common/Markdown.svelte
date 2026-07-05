<script lang="ts">
  import DOMPurify from "dompurify"
  import { marked } from "marked"

  let { content }: { content: string } = $props()

  const html = $derived(DOMPurify.sanitize(marked.parse(content, { async: false })))
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized above -->
<div class="prose-bb space-y-3 text-sm leading-relaxed">{@html html}</div>

<style>
  .prose-bb :global(h1),
  .prose-bb :global(h2),
  .prose-bb :global(h3) {
    font-weight: 700;
    margin-top: 0.75rem;
  }
  .prose-bb :global(ul) {
    list-style: disc;
    padding-left: 1.25rem;
  }
  .prose-bb :global(ol) {
    list-style: decimal;
    padding-left: 1.25rem;
  }
  .prose-bb :global(code) {
    font-family: var(--font-mono, monospace);
    font-size: 0.85em;
  }
</style>
