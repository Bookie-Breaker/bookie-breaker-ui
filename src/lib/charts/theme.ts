/**
 * Chart theme tokens bridged from the active Skeleton theme's CSS custom
 * properties, with static fallbacks for SSR/tests. Option builders take
 * tokens as input so they stay pure and unit-testable.
 */

export interface ChartTheme {
  text: string
  subtext: string
  axis: string
  splitLine: string
  tooltipBg: string
  primary: string
  success: string
  error: string
  warning: string
  /** Categorical series palette. */
  series: string[]
}

const FALLBACK_LIGHT: ChartTheme = {
  text: "#1e293b",
  subtext: "#64748b",
  axis: "#94a3b8",
  splitLine: "rgba(100, 116, 139, 0.2)",
  tooltipBg: "#ffffff",
  primary: "#2563eb",
  success: "#16a34a",
  error: "#dc2626",
  warning: "#d97706",
  series: ["#2563eb", "#16a34a", "#d97706", "#9333ea", "#0891b2", "#dc2626", "#4b5563"]
}

const FALLBACK_DARK: ChartTheme = {
  ...FALLBACK_LIGHT,
  text: "#e2e8f0",
  subtext: "#94a3b8",
  axis: "#64748b",
  splitLine: "rgba(148, 163, 184, 0.15)",
  tooltipBg: "#1e293b",
  primary: "#3b82f6",
  success: "#22c55e",
  error: "#ef4444",
  warning: "#f59e0b",
  series: ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#06b6d4", "#ef4444", "#9ca3af"]
}

function cssVar(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = styles.getPropertyValue(name).trim()
  return value || fallback
}

/** Resolve tokens for the current mode, reading Skeleton vars when in a browser. */
export function chartTheme(mode: "light" | "dark"): ChartTheme {
  const fallback = mode === "dark" ? FALLBACK_DARK : FALLBACK_LIGHT
  if (typeof document === "undefined") return fallback
  const styles = getComputedStyle(document.documentElement)
  return {
    ...fallback,
    primary: cssVar(styles, "--color-primary-500", fallback.primary),
    success: cssVar(styles, "--color-success-500", fallback.success),
    error: cssVar(styles, "--color-error-500", fallback.error),
    warning: cssVar(styles, "--color-warning-500", fallback.warning)
  }
}

/** Shared axis/tooltip scaffolding merged into every option builder. */
export function baseOption(theme: ChartTheme) {
  return {
    color: theme.series,
    textStyle: { color: theme.text },
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: theme.tooltipBg,
      borderWidth: 0,
      textStyle: { color: theme.text }
    },
    grid: { left: 48, right: 24, top: 32, bottom: 40, containLabel: true }
  }
}

export function axisStyle(theme: ChartTheme) {
  return {
    axisLine: { lineStyle: { color: theme.axis } },
    axisLabel: { color: theme.subtext },
    splitLine: { lineStyle: { color: theme.splitLine } }
  }
}
