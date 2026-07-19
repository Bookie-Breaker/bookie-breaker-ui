/**
 * Canned-envelope backend for Playwright: serves the agent/emulator/lines
 * shapes the specs need so e2e runs with no real stack (all data fetching
 * is server-side, so page.route() cannot mock it). Records the last bet
 * placement at GET /__last-bet for idempotency assertions.
 */
import { createServer } from "node:http"

const PORT = Number(process.env.STUB_PORT ?? 9200)

const meta = { timestamp: "2026-07-05T12:00:00Z", request_id: "stub-request" }

const EDGE_ID = "11111111-1111-4111-8111-111111111111"
const GAME_ID = "22222222-2222-4222-8222-222222222222"
const BET_ID = "33333333-3333-4333-8333-333333333333"
const SOCCER_EDGE_ID = "44444444-4444-4444-8444-444444444444"
const SOCCER_GAME_ID = "55555555-5555-4555-8555-555555555555"

const edgeListItem = {
  id: EDGE_ID,
  game_id: GAME_ID,
  league: "NBA",
  home_team: "LAL",
  away_team: "BOS",
  scheduled_start: "2026-07-05T19:00:00Z",
  market_type: "SPREAD",
  selection: "LAL -3.5",
  predicted_probability: 0.562,
  implied_probability: 0.52,
  edge_percentage: 4.2,
  expected_value: 0.081,
  odds_american: -110,
  sportsbook_key: "draftkings",
  kelly_fraction: 0.08,
  recommended_stake: 1.5,
  confidence: 0.85,
  detected_at: "2026-07-05T12:00:00Z",
  expires_at: "2026-07-05T19:00:00Z",
  is_stale: false,
  has_paper_bet: false,
  paper_bet_id: null
}

const edgeDetail = {
  ...edgeListItem,
  game_external_id: "odds-stub-game-1",
  odds_decimal: 1.909,
  sportsbook_id: null,
  simulation_probability: 0.548,
  game: {
    scheduled_start: "2026-07-05T19:00:00Z",
    status: "SCHEDULED",
    home_team: { id: "t1", name: "Los Angeles Lakers", abbreviation: "LAL" },
    away_team: { id: "t2", name: "Boston Celtics", abbreviation: "BOS" }
  },
  prediction: {
    id: "p1",
    model_version_id: "m1",
    adjustment_magnitude: 0.014,
    feature_importance: { pace_differential: 0.18, offensive_rating_delta: 0.31, rest_days: 0.07 }
  },
  betting_line: {
    id: "l1",
    line_value: -3.5,
    odds_american: -110,
    sportsbook_key: "draftkings",
    timestamp: "2026-07-05T11:55:00Z"
  },
  paper_bet: null,
  analysis: null
}

delete edgeDetail.home_team
delete edgeDetail.away_team

// Three-way soccer moneyline (ADR-027): the Draw outcome is one more selection.
const soccerEdgeListItem = {
  ...edgeListItem,
  id: SOCCER_EDGE_ID,
  game_id: SOCCER_GAME_ID,
  league: "EPL",
  home_team: "ARS",
  away_team: "CHE",
  market_type: "MONEYLINE",
  selection: "Draw",
  predicted_probability: 0.31,
  implied_probability: 0.27,
  edge_percentage: 3.8,
  odds_american: 250,
  recommended_stake: 1.0
}

const soccerEdgeDetail = {
  ...soccerEdgeListItem,
  game_external_id: "odds-stub-game-2",
  odds_decimal: 3.5,
  sportsbook_id: null,
  simulation_probability: 0.29,
  game: {
    scheduled_start: "2026-07-05T19:00:00Z",
    status: "SCHEDULED",
    home_team: { id: "t3", name: "Arsenal", abbreviation: "ARS" },
    away_team: { id: "t4", name: "Chelsea", abbreviation: "CHE" }
  },
  prediction: null,
  betting_line: {
    id: "l2",
    line_value: null,
    odds_american: 250,
    sportsbook_key: "draftkings",
    timestamp: "2026-07-05T11:55:00Z"
  },
  paper_bet: null,
  analysis: null
}

delete soccerEdgeDetail.home_team
delete soccerEdgeDetail.away_team

// Two FIFA_WC edges on ONE game: the same-game parlay the builder spec uses.
const FIFA_EDGE_ML_ID = "66666666-6666-4666-8666-666666666666"
const FIFA_EDGE_TOTAL_ID = "77777777-7777-4777-8777-777777777777"
const FIFA_GAME_ID = "88888888-8888-4888-8888-888888888888"
const PARLAY_BET_ID = "99999999-9999-4999-8999-999999999999"

const fifaGame = {
  scheduled_start: "2026-07-10T19:00:00Z",
  status: "SCHEDULED",
  home_team: { id: "t5", name: "France", abbreviation: "FRA" },
  away_team: { id: "t6", name: "Morocco", abbreviation: "MAR" }
}

const fifaEdgeMlListItem = {
  ...edgeListItem,
  id: FIFA_EDGE_ML_ID,
  game_id: FIFA_GAME_ID,
  league: "FIFA_WC",
  home_team: "FRA",
  away_team: "MAR",
  scheduled_start: "2026-07-10T19:00:00Z",
  market_type: "MONEYLINE",
  selection: "France",
  predicted_probability: 0.58,
  implied_probability: 0.545,
  edge_percentage: 3.5,
  odds_american: -120,
  recommended_stake: 1.1,
  expires_at: "2026-07-10T19:00:00Z"
}

const fifaEdgeMlDetail = {
  ...fifaEdgeMlListItem,
  game_external_id: "wc-semi-1",
  odds_decimal: 1.833,
  sportsbook_id: null,
  simulation_probability: 0.57,
  game: fifaGame,
  prediction: null,
  betting_line: {
    id: "l3",
    line_value: null,
    odds_american: -120,
    sportsbook_key: "draftkings",
    timestamp: "2026-07-10T11:55:00Z"
  },
  paper_bet: null,
  analysis: null
}

const fifaEdgeTotalListItem = {
  ...fifaEdgeMlListItem,
  id: FIFA_EDGE_TOTAL_ID,
  market_type: "TOTAL",
  selection: "Over 2.5",
  predicted_probability: 0.52,
  implied_probability: 0.488,
  edge_percentage: 3.2,
  odds_american: 105,
  recommended_stake: 1.0
}

const fifaEdgeTotalDetail = {
  ...fifaEdgeMlDetail,
  ...fifaEdgeTotalListItem,
  odds_decimal: 2.05,
  simulation_probability: 0.51,
  betting_line: {
    id: "l4",
    line_value: 2.5,
    odds_american: 105,
    sportsbook_key: "draftkings",
    timestamp: "2026-07-10T11:55:00Z"
  }
}

delete fifaEdgeMlDetail.home_team
delete fifaEdgeMlDetail.away_team
delete fifaEdgeTotalDetail.home_team
delete fifaEdgeTotalDetail.away_team

// Canned correlation-aware evaluation for the 2-leg same-game FIFA parlay.
const parlayEvaluation = {
  legs: [
    {
      game_id: FIFA_GAME_ID,
      game_external_id: "wc-semi-1",
      market_type: "MONEYLINE",
      side: "HOME",
      selection: "France",
      line_value: null,
      sportsbook_key: "draftkings",
      odds_american: -120,
      odds_decimal: 1.833,
      predicted_probability: 0.58,
      sim_leg_key: "ml_home"
    },
    {
      game_id: FIFA_GAME_ID,
      game_external_id: "wc-semi-1",
      market_type: "TOTAL",
      side: "OVER",
      selection: "Over 2.5",
      line_value: 2.5,
      sportsbook_key: "draftkings",
      odds_american: 105,
      odds_decimal: 2.05,
      predicted_probability: 0.52,
      sim_leg_key: "total_over"
    }
  ],
  league: "FIFA_WC",
  is_same_game: true,
  joint_probability: 0.31,
  independent_probability: 0.269,
  correlation_edge: 0.041,
  correlations: { "0-1": 0.35 },
  combined_odds_american: 264,
  combined_odds_decimal: 3.64,
  expected_value: 0.061,
  ev_pct: 6.1,
  kelly_fraction: 0.05,
  recommended_stake: 1.2,
  method: "simulation_scaled",
  meets_threshold: true,
  parlay_id: null,
  expires_at: "2026-07-10T19:00:00Z"
}

const parlayDetail = {
  id: PARLAY_BET_ID,
  game_id: null,
  game_external_id: "wc-semi-1",
  edge_id: null,
  prediction_id: null,
  league: "FIFA_WC",
  market_type: "PARLAY",
  selection: "France + Over 2.5",
  side: null,
  line_value: null,
  sportsbook_id: null,
  sportsbook_key: "parlay",
  odds_american: 264,
  odds_decimal: 3.64,
  combined_odds_american: 264,
  combined_odds_decimal: 3.64,
  stake: 1.2,
  stake_dollars: 120,
  predicted_probability: 0.31,
  edge_percentage: 3.53,
  kelly_fraction: 0.05,
  reasoning: null,
  is_parlay: true,
  is_live: false,
  result: "PENDING",
  profit_loss: null,
  profit_loss_dollars: null,
  clv: null,
  closing_line_value: null,
  closing_odds_american: null,
  grade: null,
  placed_at: "2026-07-10T12:05:00Z",
  graded_at: null,
  legs: [
    {
      id: "aaaaaaa1-1111-4111-8111-aaaaaaaaaaa1",
      game_id: FIFA_GAME_ID,
      game_external_id: "wc-semi-1",
      league: "FIFA_WC",
      leg_index: 0,
      leg_status: "PENDING",
      market_type: "MONEYLINE",
      side: "HOME",
      selection: "France",
      line_value: null,
      odds_american: -120,
      odds_decimal: 1.833
    },
    {
      id: "aaaaaaa2-2222-4222-8222-aaaaaaaaaaa2",
      game_id: FIFA_GAME_ID,
      game_external_id: "wc-semi-1",
      league: "FIFA_WC",
      leg_index: 1,
      leg_status: "PENDING",
      market_type: "TOTAL",
      side: "OVER",
      selection: "Over 2.5",
      line_value: 2.5,
      odds_american: 105,
      odds_decimal: 2.05
    }
  ]
}

// Phase 7 Wave 2: one FIFA_WC game in progress with live (SharpAPI-sourced)
// lines and a live edge. expires_at is computed per request so countdown
// chips always have a future, short-expiry target at test runtime.
const LIVE_GAME_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const LIVE_EDGE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const LIVE_BET_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

const liveExpiry = () => new Date(Date.now() + 5 * 60_000).toISOString()

const liveLines = () => {
  const base = {
    game_id: LIVE_GAME_ID,
    sportsbook_id: "sb-1",
    line_value: null,
    timestamp: new Date().toISOString(),
    is_live: true,
    is_opening: false,
    is_closing: false
  }
  return [
    {
      ...base,
      id: "ll-1",
      sportsbook_key: "draftkings",
      market_type: "MONEYLINE",
      selection: "Argentina",
      side: "HOME",
      odds_american: -105,
      odds_decimal: 1.952,
      implied_probability: 0.512
    },
    {
      ...base,
      id: "ll-2",
      sportsbook_key: "fanduel",
      market_type: "MONEYLINE",
      selection: "Argentina",
      side: "HOME",
      odds_american: -110,
      odds_decimal: 1.909,
      implied_probability: 0.524
    },
    {
      ...base,
      id: "ll-3",
      sportsbook_key: "draftkings",
      market_type: "MONEYLINE",
      selection: "Draw",
      side: "DRAW",
      odds_american: 260,
      odds_decimal: 3.6,
      implied_probability: 0.278
    },
    {
      ...base,
      id: "ll-4",
      sportsbook_key: "draftkings",
      market_type: "MONEYLINE",
      selection: "England",
      side: "AWAY",
      odds_american: 320,
      odds_decimal: 4.2,
      implied_probability: 0.238
    },
    {
      ...base,
      id: "ll-5",
      sportsbook_key: "draftkings",
      market_type: "TOTAL",
      selection: "Over 2.5",
      side: "OVER",
      line_value: 2.5,
      odds_american: 130,
      odds_decimal: 2.3,
      implied_probability: 0.435
    },
    {
      ...base,
      id: "ll-6",
      sportsbook_key: "fanduel",
      market_type: "TOTAL",
      selection: "Over 2.5",
      side: "OVER",
      line_value: 2.5,
      odds_american: 125,
      odds_decimal: 2.25,
      implied_probability: 0.444
    }
  ]
}

// is_live rides on the runtime payload ahead of the agent spec regen — the
// UI filters client-side on the field (see src/lib/utils/live.ts).
const liveEdgeListItem = () => ({
  ...edgeListItem,
  id: LIVE_EDGE_ID,
  game_id: LIVE_GAME_ID,
  league: "FIFA_WC",
  home_team: "ARG",
  away_team: "ENG",
  scheduled_start: liveExpiry(),
  market_type: "MONEYLINE",
  selection: "Argentina",
  predicted_probability: 0.55,
  implied_probability: 0.512,
  edge_percentage: 3.8,
  expected_value: 0.074,
  odds_american: -105,
  recommended_stake: 0,
  kelly_fraction: 0.04,
  confidence: 0.7,
  detected_at: new Date().toISOString(),
  expires_at: liveExpiry(),
  is_live: true
})

const liveEdgeDetail = () => {
  const item = liveEdgeListItem()
  delete item.home_team
  delete item.away_team
  return {
    ...item,
    game_external_id: "wc-final-live",
    odds_decimal: 1.952,
    sportsbook_id: null,
    simulation_probability: 0.54,
    game: {
      scheduled_start: "2026-07-19T18:00:00Z",
      status: "IN_PROGRESS",
      home_team: { id: "t7", name: "Argentina", abbreviation: "ARG" },
      away_team: { id: "t8", name: "England", abbreviation: "ENG" }
    },
    prediction: null,
    betting_line: {
      id: "l5",
      line_value: null,
      odds_american: -105,
      sportsbook_key: "draftkings",
      timestamp: new Date().toISOString()
    },
    paper_bet: null,
    analysis: null
  }
}

// Canned graded-ledger live bet: the ledger filter/badge spec needs one
// live row that exists without any placement having happened first.
const liveLedgerBet = {
  id: LIVE_BET_ID,
  game_id: LIVE_GAME_ID,
  game_external_id: "wc-final-live",
  edge_id: LIVE_EDGE_ID,
  prediction_id: null,
  league: "FIFA_WC",
  market_type: "MONEYLINE",
  selection: "Argentina",
  side: "HOME",
  line_value: null,
  sportsbook_id: null,
  sportsbook_key: "draftkings",
  odds_american: -105,
  odds_decimal: 1.952,
  stake: 1.0,
  stake_dollars: 100,
  predicted_probability: 0.55,
  edge_percentage: 3.8,
  kelly_fraction: 0.04,
  reasoning: null,
  is_parlay: false,
  is_live: true,
  result: "PENDING",
  profit_loss: null,
  profit_loss_dollars: null,
  clv: null,
  placed_at: "2026-07-19T18:20:00Z",
  graded_at: null
}

const movement = [
  {
    game_id: "odds-stub-game-1",
    sportsbook_key: "draftkings",
    market_type: "SPREAD",
    selection: "LAL -3.5",
    opening_line: -3.5,
    current_line: -4.0,
    closing_line: null,
    line_snapshots: [
      {
        line_value: -3.5,
        odds_american: -110,
        timestamp: "2026-07-05T09:00:00Z",
        is_opening: true
      },
      { line_value: -4.0, odds_american: -108, timestamp: "2026-07-05T11:00:00Z" }
    ]
  }
]

const performance = {
  period: { from: "2026-06-01T00:00:00Z", to: "2026-07-05T12:00:00Z", window: "all_time" },
  total_bets: 137,
  total_wins: 71,
  total_losses: 63,
  total_pushes: 3,
  win_rate: 0.53,
  roi: 0.062,
  total_wagered_units: 180,
  total_profit_units: 11.2,
  total_wagered_dollars: 18000,
  total_profit_dollars: 1120,
  avg_odds_american: -108,
  avg_edge_percentage: 3.9,
  avg_clv: 0.014,
  longest_win_streak: 6,
  longest_loss_streak: 4,
  brier_score: 0.213,
  calibration_error: 0.031
}

const calibration = {
  period: performance.period,
  n_bins: 10,
  total_graded: 134,
  brier_score: 0.213,
  calibration_error: 0.031,
  bins: Array.from({ length: 10 }, (_, index) => {
    const counts = [0, 0, 0, 2, 9, 41, 52, 24, 6, 0]
    const lower = index / 10
    return {
      lower,
      upper: lower + 0.1,
      bet_count: counts[index],
      avg_predicted_probability: counts[index] ? lower + 0.05 : null,
      actual_win_rate: counts[index] ? Math.min(1, lower + 0.04) : null
    }
  })
}

const breakdown = {
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
    }
  ]
}

const history = {
  interval: "per_bet",
  snapshots: Array.from({ length: 12 }, (_, index) => ({
    timestamp: `2026-06-${String(index + 1).padStart(2, "0")}T12:00:00Z`,
    bankroll_units: 100 + index,
    bankroll_dollars: (100 + index) * 100,
    total_bets: index + 1,
    total_wins: Math.ceil((index + 1) / 2),
    total_losses: Math.floor((index + 1) / 2),
    win_rate: 0.52,
    roi: index / 200,
    units_won: index,
    avg_clv: 0.012
  }))
}

const placedBet = {
  id: BET_ID,
  game_id: GAME_ID,
  game_external_id: "odds-stub-game-1",
  edge_id: EDGE_ID,
  prediction_id: null,
  league: "NBA",
  market_type: "SPREAD",
  selection: "LAL -3.5",
  side: "HOME",
  line_value: -3.5,
  sportsbook_id: null,
  sportsbook_key: "draftkings",
  odds_american: -110,
  odds_decimal: 1.909,
  stake: 1.5,
  stake_dollars: 150,
  predicted_probability: 0.562,
  edge_percentage: 4.2,
  kelly_fraction: 0.08,
  reasoning: null,
  is_parlay: false,
  is_live: false,
  result: "PENDING",
  profit_loss: null,
  profit_loss_dollars: null,
  clv: null,
  placed_at: "2026-07-05T12:05:00Z",
  graded_at: null
}

const slate = {
  date: "2026-07-05",
  games: [
    {
      game_id: GAME_ID,
      league: "NBA",
      scheduled_start: "2026-07-05T19:00:00Z",
      status: "SCHEDULED",
      home_team: { id: "t1", name: "Los Angeles Lakers", abbreviation: "LAL" },
      away_team: { id: "t2", name: "Boston Celtics", abbreviation: "BOS" },
      prediction: {
        id: "p1",
        market_type: "SPREAD",
        selection: "LAL -3.5",
        predicted_probability: 0.562,
        predicted_at: "2026-07-05T12:00:00Z"
      },
      edges: [
        {
          id: EDGE_ID,
          market_type: "SPREAD",
          selection: "LAL -3.5",
          edge_percentage: 4.2,
          sportsbook_key: "draftkings",
          has_paper_bet: false
        }
      ]
    }
  ]
}

const dashboard = {
  active_edges: {
    count: 1,
    by_league: { NBA: 1 },
    avg_edge_pct: 4.2,
    top_edge: {
      id: EDGE_ID,
      selection: "LAL -3.5",
      edge_percentage: 4.2,
      sportsbook_key: "draftkings"
    }
  },
  open_bets: { count: 2, total_exposure_units: 3.0, games_pending: 2 },
  performance_summary: {
    today: { bets: 2, wins: 1, losses: 1, profit_units: 0.4 },
    this_week: { bets: 9, wins: 5, losses: 4, profit_units: 1.2 },
    all_time: { bets: 137, wins: 71, losses: 63, win_rate: 0.53, roi: 0.062, profit_units: 11.2 }
  },
  pipeline_status: {
    last_run: {
      pipeline_run_id: "r1",
      status: "COMPLETED",
      completed_at: "2026-07-05T11:00:00Z",
      games_processed: 4,
      edges_found: 1,
      bets_placed: 1
    },
    next_scheduled_run: "2026-07-05T20:00:00Z"
  }
}

let lastBet = null
const placedBets = []
let lastParlay = null
const placedParlays = []
let lastEvaluate = null

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const path = url.pathname

  const respond = (status, body) => {
    res.writeHead(status, { "content-type": "application/json" })
    res.end(JSON.stringify(body))
  }
  const envelope = (data) => respond(200, { data, meta })
  const paged = (data) =>
    respond(200, {
      data,
      meta: { ...meta, pagination: { limit: 50, has_more: false, next_cursor: null } }
    })
  const notFound = () =>
    respond(404, { error: { code: "RESOURCE_NOT_FOUND", message: `no stub for ${path}` }, meta })

  if (req.method === "POST" && path === "/api/v1/emulator/bets") {
    let raw = ""
    req.on("data", (chunk) => (raw += chunk))
    req.on("end", () => {
      lastBet = {
        idempotencyKey: req.headers["x-idempotency-key"] ?? null,
        body: JSON.parse(raw || "{}")
      }
      placedBets.push(lastBet)
      // Echo is_live so live placements come back flagged (Phase 7 Wave 2).
      respond(201, { data: { ...placedBet, is_live: lastBet.body.is_live === true }, meta })
    })
    return
  }

  if (req.method === "POST" && path === "/api/v1/agent/parlays/evaluate") {
    let raw = ""
    req.on("data", (chunk) => (raw += chunk))
    req.on("end", () => {
      lastEvaluate = JSON.parse(raw || "{}")
      respond(200, { data: parlayEvaluation, meta })
    })
    return
  }

  if (req.method === "POST" && path === "/api/v1/emulator/parlays") {
    let raw = ""
    req.on("data", (chunk) => (raw += chunk))
    req.on("end", () => {
      lastParlay = {
        idempotencyKey: req.headers["x-idempotency-key"] ?? null,
        body: JSON.parse(raw || "{}")
      }
      placedParlays.push(lastParlay)
      respond(201, { data: parlayDetail, meta })
    })
    return
  }

  if (path === "/__last-bet") return respond(200, lastBet ?? {})
  if (path === "/__placed-bets") return respond(200, placedBets)
  if (path === "/__last-parlay") return respond(200, lastParlay ?? {})
  if (path === "/__placed-parlays") return respond(200, placedParlays)
  if (path === "/__last-evaluate") return respond(200, lastEvaluate ?? {})
  if (path === "/api/v1/agent/dashboard") return envelope(dashboard)
  if (path === "/api/v1/agent/alerts") return paged([])
  if (path === "/api/v1/agent/edges")
    return paged([
      edgeListItem,
      soccerEdgeListItem,
      fifaEdgeMlListItem,
      fifaEdgeTotalListItem,
      liveEdgeListItem()
    ])
  if (path === `/api/v1/agent/edges/${LIVE_EDGE_ID}`) return envelope(liveEdgeDetail())
  if (path === `/api/v1/agent/edges/${EDGE_ID}`) return envelope(edgeDetail)
  if (path === `/api/v1/agent/edges/${SOCCER_EDGE_ID}`) return envelope(soccerEdgeDetail)
  if (path === `/api/v1/agent/edges/${FIFA_EDGE_ML_ID}`) return envelope(fifaEdgeMlDetail)
  if (path === `/api/v1/agent/edges/${FIFA_EDGE_TOTAL_ID}`) return envelope(fifaEdgeTotalDetail)
  if (path === `/api/v1/emulator/parlays/${PARLAY_BET_ID}`) return envelope(parlayDetail)
  if (path === `/api/v1/emulator/bets/${PARLAY_BET_ID}`) return envelope(parlayDetail)
  if (path === "/api/v1/agent/slate") return envelope(slate)
  if (path === "/api/v1/emulator/bets") {
    const ledger = [liveLedgerBet, ...(lastBet ? [{ ...placedBet, is_live: false }] : [])]
    const isLive = url.searchParams.get("is_live")
    const filtered =
      isLive === "true"
        ? ledger.filter((bet) => bet.is_live)
        : isLive === "false"
          ? ledger.filter((bet) => !bet.is_live)
          : ledger
    return paged(filtered)
  }
  if (path === `/api/v1/emulator/bets/${LIVE_BET_ID}`)
    return envelope({
      ...liveLedgerBet,
      closing_line_value: null,
      closing_odds_american: null,
      grade: null
    })
  if (path === `/api/v1/emulator/bets/${BET_ID}`)
    return envelope({
      ...placedBet,
      closing_line_value: null,
      closing_odds_american: null,
      grade: null
    })
  if (path === "/api/v1/emulator/performance") return envelope(performance)
  if (path === "/api/v1/emulator/performance/calibration") return envelope(calibration)
  if (path === "/api/v1/emulator/performance/breakdown") return envelope(breakdown)
  if (path === "/api/v1/emulator/bankroll/history") return envelope(history)
  if (path === "/api/v1/lines/current") {
    // is_live=true serves the in-progress FIFA_WC game's live frames (ADR-031).
    if (url.searchParams.get("is_live") === "true") return paged(liveLines())
    return paged([])
  }
  if (path === "/api/v1/lines/game/odds-stub-game-1/movement") return envelope(movement)
  if (path.startsWith("/api/v1/sim/games/")) return notFound() // simulations expired
  return notFound()
})

server.listen(PORT, () => {
  console.log(`stub backend listening on :${PORT}`)
})
