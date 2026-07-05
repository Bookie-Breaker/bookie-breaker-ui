/**
 * Odds and edge conversions.
 *
 * Edge units are a known trap: REST responses carry edge_percentage in
 * PERCENTAGE POINTS (4.2 = 4.2%), while Redis event payloads carry a
 * FRACTION (0.042). Convert here, nowhere else.
 */

export function americanToDecimal(odds: number): number {
  return odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds)
}

export function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) return Math.round((decimal - 1) * 100)
  return Math.round(-100 / (decimal - 1))
}

export function americanToImplied(odds: number): number {
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100)
}

/** Redis events speak fractions (0.042); the UI displays points (4.2). */
export function edgeFractionToPoints(fraction: number): number {
  return fraction * 100
}

export function edgePointsToFraction(points: number): number {
  return points / 100
}
