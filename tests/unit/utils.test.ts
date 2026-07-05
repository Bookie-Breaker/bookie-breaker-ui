import { describe, expect, it } from "vitest"

import { deriveSide } from "$lib/utils/bet-side"
import { formatAmerican, formatPoints, formatProbability, formatUnits } from "$lib/utils/format"
import {
  americanToDecimal,
  americanToImplied,
  decimalToAmerican,
  edgeFractionToPoints,
  edgePointsToFraction
} from "$lib/utils/odds"

describe("odds conversions", () => {
  it("converts american to decimal", () => {
    expect(americanToDecimal(-110)).toBeCloseTo(1.909, 3)
    expect(americanToDecimal(150)).toBeCloseTo(2.5, 3)
  })

  it("round-trips decimal to american", () => {
    expect(decimalToAmerican(2.5)).toBe(150)
    expect(decimalToAmerican(1.909)).toBe(-110)
  })

  it("computes implied probability", () => {
    expect(americanToImplied(-110)).toBeCloseTo(0.5238, 4)
    expect(americanToImplied(150)).toBeCloseTo(0.4, 4)
  })

  it("normalizes edge units between events (fractions) and REST (points)", () => {
    expect(edgeFractionToPoints(0.042)).toBeCloseTo(4.2)
    expect(edgePointsToFraction(4.2)).toBeCloseTo(0.042)
  })
})

describe("format", () => {
  it("signs american odds", () => {
    expect(formatAmerican(150)).toBe("+150")
    expect(formatAmerican(-110)).toBe("-110")
    expect(formatAmerican(null)).toBe("—")
  })

  it("formats probabilities, points, and units", () => {
    expect(formatProbability(0.5623)).toBe("56.2%")
    expect(formatPoints(4.2, { signed: true })).toBe("+4.20%")
    expect(formatUnits(-1.5)).toBe("-1.50u")
    expect(formatUnits(2.345)).toBe("+2.35u")
  })
})

describe("deriveSide", () => {
  it("detects totals", () => {
    expect(deriveSide("TOTAL", "Over 224.5", null, null)).toBe("OVER")
    expect(deriveSide("TOTAL", "Under 224.5", null, null)).toBe("UNDER")
  })

  it("matches full team names", () => {
    expect(
      deriveSide("SPREAD", "Los Angeles Lakers -3.5", "Los Angeles Lakers", "Boston Celtics")
    ).toBe("HOME")
    expect(deriveSide("MONEYLINE", "Boston Celtics", "Los Angeles Lakers", "Boston Celtics")).toBe(
      "AWAY"
    )
  })

  it("matches abbreviations against team names", () => {
    expect(deriveSide("SPREAD", "LAL -3.5", "LAL", "BOS")).toBe("HOME")
    expect(deriveSide("SPREAD", "BOS +3.5", "LAL", "BOS")).toBe("AWAY")
  })

  it("returns null when ambiguous so the form asks the user", () => {
    expect(deriveSide("SPREAD", "Somebody -3.5", "LAL", "BOS")).toBeNull()
    expect(deriveSide("TOTAL", "224.5", null, null)).toBeNull()
  })
})
