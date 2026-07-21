/**
 * Shared typed fixtures for unit tests. Overrides are shallow-merged so each
 * test states only the fields it actually asserts on.
 */
import type {
  AlertData,
  BetData,
  BetDetailData,
  DashboardData,
  EdgeDetail,
  EdgeListItem,
  LineSnapshot,
  ParlayEvaluationData,
  ParlayLeg,
  PerformanceData,
  SlateData
} from "$lib/api/envelope"

export function edgeListItem(overrides: Partial<EdgeListItem> = {}): EdgeListItem {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    game_id: "22222222-2222-4222-8222-222222222222",
    league: "NBA",
    home_team: "LAL",
    away_team: "BOS",
    scheduled_start: "2026-07-21T00:00:00Z",
    market_type: "SPREAD",
    selection: "LAL -3.5",
    predicted_probability: 0.56,
    implied_probability: 0.52,
    edge_percentage: 4.0,
    expected_value: 0.07,
    odds_american: -110,
    sportsbook_key: "draftkings",
    kelly_fraction: 0.05,
    recommended_stake: 1.0,
    confidence: 0.8,
    detected_at: "2026-07-20T12:00:00Z",
    expires_at: "2026-07-21T00:00:00Z",
    is_stale: false,
    is_live: false,
    has_paper_bet: false,
    paper_bet_id: null,
    ...overrides
  }
}

export function edgeDetail(overrides: Partial<EdgeDetail> = {}): EdgeDetail {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    game_id: "22222222-2222-4222-8222-222222222222",
    game_external_id: "odds-game-1",
    league: "NBA",
    market_type: "SPREAD",
    selection: "LAL -3.5",
    predicted_probability: 0.56,
    simulation_probability: 0.54,
    implied_probability: 0.52,
    edge_percentage: 4.0,
    expected_value: 0.07,
    odds_american: -110,
    odds_decimal: 1.909,
    sportsbook_id: null,
    sportsbook_key: "draftkings",
    kelly_fraction: 0.05,
    recommended_stake: 1.2,
    confidence: 0.8,
    detected_at: "2026-07-20T12:00:00Z",
    expires_at: "2026-07-21T00:00:00Z",
    is_stale: false,
    game: {
      home_team: { id: "t-1", name: "Los Angeles Lakers", abbreviation: "LAL" },
      away_team: { id: "t-2", name: "Boston Celtics", abbreviation: "BOS" },
      scheduled_start: "2026-07-21T00:00:00Z",
      status: "SCHEDULED"
    },
    betting_line: {
      id: "line-1",
      line_value: -3.5,
      odds_american: -110,
      sportsbook_key: "draftkings",
      timestamp: "2026-07-20T11:00:00Z"
    },
    prediction: {
      id: "pred-1",
      model_version_id: "model-1",
      adjustment_magnitude: 0.021,
      feature_importance: { pace_differential: 0.18, rest_days: -0.07 }
    },
    paper_bet: null,
    analysis: null,
    ...overrides
  } as EdgeDetail
}

export function betData(overrides: Partial<BetData> = {}): BetData {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    edge_id: "11111111-1111-4111-8111-111111111111",
    game_id: "22222222-2222-4222-8222-222222222222",
    game_external_id: "odds-game-1",
    prediction_id: null,
    market_type: "SPREAD",
    selection: "LAL -3.5",
    side: "HOME",
    line_value: -3.5,
    sportsbook_id: null,
    sportsbook_key: "draftkings",
    odds_american: -110,
    odds_decimal: 1.909,
    predicted_probability: 0.56,
    edge_percentage: 4.0,
    kelly_fraction: 0.05,
    stake: 1.5,
    stake_dollars: 150,
    result: "PENDING",
    profit_loss: null,
    profit_loss_dollars: null,
    clv: null,
    reasoning: null,
    is_parlay: false,
    is_live: false,
    placed_at: "2026-07-20T13:00:00Z",
    graded_at: null,
    ...overrides
  }
}

export function betDetail(overrides: Partial<BetDetailData> = {}): BetDetailData {
  return {
    ...betData(),
    closing_line_value: null,
    closing_odds_american: null,
    grade: null,
    ...overrides
  } as BetDetailData
}

export function parlayLeg(overrides: Partial<ParlayLeg> = {}): ParlayLeg {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    game_id: "22222222-2222-4222-8222-222222222222",
    game_external_id: "odds-game-1",
    league: "NBA",
    leg_index: 0,
    leg_status: "PENDING",
    market_type: "SPREAD",
    side: "HOME",
    selection: "LAL -3.5",
    line_value: -3.5,
    odds_american: -110,
    odds_decimal: 1.909,
    ...overrides
  }
}

export function lineSnapshot(overrides: Partial<LineSnapshot> = {}): LineSnapshot {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    game_id: "22222222-2222-4222-8222-222222222222",
    sportsbook_id: "book-1",
    sportsbook_key: "draftkings",
    market_type: "SPREAD",
    selection: "LAL -3.5",
    line_value: -3.5,
    odds_american: -110,
    odds_decimal: 1.909,
    implied_probability: 0.524,
    timestamp: "2026-07-20T12:00:00Z",
    ...overrides
  } as LineSnapshot
}

export function alertData(overrides: Partial<AlertData> = {}): AlertData {
  return {
    id: "66666666-6666-4666-8666-666666666666",
    edge_id: "11111111-1111-4111-8111-111111111111",
    message: "New NBA edge: LAL -3.5 (+4.0%)",
    priority: "HIGH",
    channel: "REDIS",
    payload: {},
    delivered_at: "2026-07-20T12:00:00Z",
    acknowledged_at: null,
    ...overrides
  }
}

export function dashboardData(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    active_edges: {
      count: 3,
      avg_edge_pct: 3.4,
      by_league: { NBA: 2, EPL: 1 },
      top_edge: {
        id: "11111111-1111-4111-8111-111111111111",
        selection: "LAL -3.5",
        edge_percentage: 4.0
      }
    },
    open_bets: { count: 2, games_pending: 2, total_exposure_units: 2.7 },
    performance_summary: {
      all_time: { roi: 0.062, profit_units: 4.1, bets: 137 },
      this_week: { roi: 0.01, profit_units: 0.4, bets: 9 },
      today: { roi: 0, profit_units: 0, bets: 0 }
    },
    pipeline_status: {
      next_scheduled_run: "2026-07-21T09:00:00Z",
      last_run: { status: "COMPLETED", edges_found: 3, completed_at: "2026-07-20T09:05:00Z" }
    },
    ...overrides
  } as DashboardData
}

export function performanceData(overrides: Partial<PerformanceData> = {}): PerformanceData {
  return {
    period: { window: "all_time", to: "2026-07-20T00:00:00Z" },
    total_bets: 137,
    total_wins: 72,
    total_losses: 63,
    total_pushes: 2,
    win_rate: 0.533,
    roi: 0.062,
    total_profit_units: 4.1,
    total_profit_dollars: 410,
    total_wagered_units: 66,
    total_wagered_dollars: 6600,
    avg_clv: 0.014,
    avg_edge_percentage: 3.8,
    avg_odds_american: -108,
    brier_score: 0.213,
    calibration_error: 0.031,
    longest_win_streak: 6,
    longest_loss_streak: 4,
    ...overrides
  } as PerformanceData
}

export function slateData(overrides: Partial<SlateData> = {}): SlateData {
  return {
    date: "2026-07-20",
    games: [
      {
        game_id: "22222222-2222-4222-8222-222222222222",
        league: "NBA",
        scheduled_start: "2026-07-21T00:00:00Z",
        status: "SCHEDULED",
        home_team: { id: "t-1", name: "Los Angeles Lakers", abbreviation: "LAL" },
        away_team: { id: "t-2", name: "Boston Celtics", abbreviation: "BOS" },
        prediction: {
          id: "pred-1",
          market_type: "MONEYLINE",
          selection: "LAL",
          predicted_probability: 0.58,
          predicted_at: "2026-07-20T09:00:00Z"
        },
        edges: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            market_type: "SPREAD",
            selection: "LAL -3.5",
            edge_percentage: 4.0,
            sportsbook_key: "draftkings",
            has_paper_bet: false
          }
        ]
      }
    ],
    ...overrides
  }
}

export function parlayEvaluation(
  overrides: Partial<ParlayEvaluationData> = {}
): ParlayEvaluationData {
  return {
    parlay_id: null,
    league: "NBA",
    method: "JOINT_SIM",
    is_same_game: true,
    joint_probability: 0.31,
    independent_probability: 0.28,
    correlation_edge: 0.03,
    correlations: { "0-1": 0.42 },
    combined_odds_american: 264,
    combined_odds_decimal: 3.64,
    expected_value: 0.128,
    ev_pct: 12.8,
    kelly_fraction: 0.048,
    recommended_stake: 1.2,
    meets_threshold: true,
    expires_at: "2026-07-21T00:00:00Z",
    legs: [
      {
        game_id: "22222222-2222-4222-8222-222222222222",
        game_external_id: "odds-game-1",
        market_type: "SPREAD",
        side: "HOME",
        selection: "LAL -3.5",
        line_value: -3.5,
        odds_american: -110,
        odds_decimal: 1.909,
        predicted_probability: 0.56,
        sportsbook_key: "draftkings"
      },
      {
        game_id: "22222222-2222-4222-8222-222222222222",
        game_external_id: "odds-game-1",
        market_type: "TOTAL",
        side: "OVER",
        selection: "Over 224.5",
        line_value: 224.5,
        odds_american: -105,
        odds_decimal: 1.952,
        predicted_probability: 0.55,
        sportsbook_key: "draftkings"
      }
    ],
    ...overrides
  }
}
