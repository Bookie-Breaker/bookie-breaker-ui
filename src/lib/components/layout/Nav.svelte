<script lang="ts">
  import {
    ChartCandlestickIcon,
    ChartLineIcon,
    HouseIcon,
    LayersIcon,
    ListOrderedIcon,
    ReceiptIcon,
    TrendingUpIcon
  } from "@lucide/svelte"
  import { page } from "$app/state"

  const links = [
    { label: "Home", href: "/", icon: HouseIcon },
    { label: "Edges", href: "/edges", icon: TrendingUpIcon },
    { label: "Slate", href: "/slate", icon: ListOrderedIcon },
    { label: "Lines", href: "/lines", icon: ChartCandlestickIcon },
    { label: "Parlay", href: "/parlay", icon: LayersIcon },
    { label: "Performance", href: "/performance", icon: ChartLineIcon },
    { label: "Bets", href: "/bets", icon: ReceiptIcon }
  ]

  function isActive(href: string): boolean {
    if (href === "/") return page.url.pathname === "/"
    return page.url.pathname.startsWith(href)
  }
</script>

<nav class="flex h-full flex-col gap-1 p-2" aria-label="Primary">
  {#each links as link (link.href)}
    {@const Icon = link.icon}
    <a
      href={link.href}
      class="btn justify-start gap-3 px-3 {isActive(link.href)
        ? 'preset-filled-primary-500'
        : 'hover:preset-tonal'}"
      aria-current={isActive(link.href) ? "page" : undefined}
    >
      <Icon class="size-4 shrink-0" />
      <span class="hidden md:inline">{link.label}</span>
    </a>
  {/each}
</nav>
