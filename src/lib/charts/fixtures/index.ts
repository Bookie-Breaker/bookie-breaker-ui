/**
 * Mock payloads matching real API shapes — the roadmap's chart risk
 * mitigation: option builders are developed and unit-tested against
 * these before any backend wiring. Also served by the Playwright stub.
 */
import type {
  BankrollSnapshot,
  BreakdownData,
  CalibrationData,
  Distribution,
  LineMovement
} from "$lib/api/envelope"

export const lineMovementFixture: LineMovement[] = [
  {
    game_id: "odds-fixture-1",
    sportsbook_key: "draftkings",
    market_type: "SPREAD",
    selection: "LAL -3.5",
    opening_line: -3.5,
    opening_odds: -110,
    current_line: -4.5,
    current_odds: -108,
    closing_line: -5,
    closing_odds: -112,
    total_movement: -1.5,
    is_reverse_movement: false,
    line_snapshots: [
      {
        line_value: -3.5,
        odds_american: -110,
        timestamp: "2026-03-01T12:00:00Z",
        is_opening: true
      },
      { line_value: -4, odds_american: -112, timestamp: "2026-03-01T15:00:00Z" },
      { line_value: -4.5, odds_american: -108, timestamp: "2026-03-01T18:30:00Z" }
    ]
  },
  {
    game_id: "odds-fixture-1",
    sportsbook_key: "pinnacle",
    market_type: "SPREAD",
    selection: "LAL -3.5",
    opening_line: -4,
    opening_odds: -105,
    current_line: -4.5,
    current_odds: -110,
    line_snapshots: [
      { line_value: -4, odds_american: -105, timestamp: "2026-03-01T12:05:00Z", is_opening: true },
      { line_value: -4.5, odds_american: -110, timestamp: "2026-03-01T17:00:00Z" }
    ]
  }
]

export const featureImportanceFixture: Record<string, number> = {
  pace_differential: 0.18,
  offensive_rating_delta: 0.31,
  rest_days: 0.07,
  home_court: 0.12,
  recent_form: -0.09,
  injury_impact: -0.22
}

export const distributionFixture: Distribution = {
  type: "discrete",
  values: Object.fromEntries(
    Array.from({ length: 41 }, (_, index) => {
      const margin = index - 20
      const probability = Math.exp(-((margin - 4) ** 2) / 90) / 16
      return [String(margin), Number(probability.toFixed(5))]
    })
  ),
  mean: 4.1,
  std_dev: 6.7,
  min: -20,
  max: 20
}

/** One player stat's simulated distribution (Phase 7 Wave 3 prop charts). */
export const playerShotsDistributionFixture: Distribution = {
  type: "discrete",
  values: { "0": 0.08, "1": 0.18, "2": 0.24, "3": 0.22, "4": 0.15, "5": 0.08, "6": 0.05 },
  mean: 2.6,
  std_dev: 1.4,
  min: 0,
  max: 6
}

export const bankrollHistoryFixture: BankrollSnapshot[] = Array.from({ length: 30 }, (_, index) => {
  const units = 100 + index * 0.8 + Math.sin(index / 3) * 4
  return {
    timestamp: new Date(Date.UTC(2026, 2, 1 + index)).toISOString(),
    bankroll_units: Number(units.toFixed(2)),
    bankroll_dollars: Number((units * 100).toFixed(2)),
    total_bets: 3 * (index + 1),
    total_wins: Math.round(1.6 * (index + 1)),
    total_losses: Math.round(1.3 * (index + 1)),
    win_rate: Number((0.5 + Math.sin(index / 5) * 0.05).toFixed(3)),
    roi: Number(((units - 100) / (3 * (index + 1))).toFixed(4)),
    units_won: Number((units - 100).toFixed(2)),
    avg_clv: Number((0.012 + Math.cos(index / 4) * 0.008).toFixed(4))
  }
})

export const calibrationFixture: CalibrationData = {
  period: { to: "2026-03-30T00:00:00Z", window: "all_time" },
  n_bins: 10,
  total_graded: 137,
  brier_score: 0.213,
  calibration_error: 0.031,
  bins: Array.from({ length: 10 }, (_, index) => {
    const lower = index / 10
    const counts = [0, 0, 0, 2, 9, 41, 52, 27, 6, 0]
    const count = counts[index]
    return {
      lower,
      upper: lower + 0.1,
      bet_count: count,
      avg_predicted_probability: count ? Number((lower + 0.05).toFixed(3)) : null,
      actual_win_rate: count ? Number(Math.min(1, lower + 0.03 + index * 0.005).toFixed(3)) : null
    }
  })
}

export const breakdownFixture: BreakdownData = {
  group_by: "market_type",
  breakdowns: [
    {
      group: "SPREAD",
      total_bets: 61,
      wins: 33,
      losses: 27,
      pushes: 1,
      win_rate: 0.55,
      roi: 0.062,
      total_profit_units: 4.1,
      avg_clv: 0.014,
      avg_edge_percentage: 3.8
    },
    {
      group: "TOTAL",
      total_bets: 48,
      wins: 22,
      losses: 26,
      pushes: 0,
      win_rate: 0.458,
      roi: -0.041,
      total_profit_units: -2.2,
      avg_clv: 0.006,
      avg_edge_percentage: 3.1
    },
    {
      group: "MONEYLINE",
      total_bets: 28,
      wins: 15,
      losses: 13,
      pushes: 0,
      win_rate: 0.536,
      roi: 0.088,
      total_profit_units: 2.6,
      avg_clv: 0.019,
      avg_edge_percentage: 4.4
    }
  ]
}
