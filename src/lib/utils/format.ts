/** Display formatting helpers shared by tables, cards, and charts. */

/** American odds always carry an explicit sign: +150, -110. */
export function formatAmerican(odds: number | null | undefined): string {
  if (odds === null || odds === undefined) return "—"
  return odds > 0 ? `+${odds}` : String(odds)
}

/** A probability fraction (0.562) as a percentage ("56.2%"). */
export function formatProbability(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return "—"
  return `${(value * 100).toFixed(digits)}%`
}

/** Percentage points (4.2) as "+4.2%" (signed when requested). */
export function formatPoints(
  value: number | null | undefined,
  options: { signed?: boolean } = {}
): string {
  if (value === null || value === undefined) return "—"
  const sign = options.signed && value > 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
}

export function formatUnits(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return "—"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(digits)}u`
}

export function formatLine(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  return value > 0 ? `+${value}` : String(value)
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  })
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}
