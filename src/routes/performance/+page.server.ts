import {
  getBankrollHistory,
  getBreakdown,
  getCalibration,
  getPerformance
} from "$lib/server/api/emulator"

import type { PageServerLoad } from "./$types"

const GROUPS = ["league", "market_type", "sportsbook", "month"] as const
type GroupBy = (typeof GROUPS)[number]

export const load: PageServerLoad = async ({ fetch, depends, url }) => {
  depends("app:performance")
  const groupParam = url.searchParams.get("group_by")
  const groupBy: GroupBy = GROUPS.includes(groupParam as GroupBy)
    ? (groupParam as GroupBy)
    : "market_type"
  const league = url.searchParams.get("league") ?? undefined

  const [performance, history, calibration, breakdown] = await Promise.allSettled([
    getPerformance(fetch, { league }),
    getBankrollHistory(fetch, { interval: "per_bet" }),
    getCalibration(fetch, { league }),
    getBreakdown(fetch, groupBy)
  ])

  return {
    groupBy,
    performance: performance.status === "fulfilled" ? performance.value.data : null,
    history: history.status === "fulfilled" ? history.value.data : null,
    calibration: calibration.status === "fulfilled" ? calibration.value.data : null,
    breakdown: breakdown.status === "fulfilled" ? breakdown.value.data : null
  }
}
