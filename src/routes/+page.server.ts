import { getAlerts, getDashboard } from "$lib/server/api/agent"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ fetch, depends, url }) => {
  depends("app:dashboard")
  const league = url.searchParams.get("league") ?? undefined
  const [dashboard, alerts] = await Promise.allSettled([
    getDashboard(fetch, league),
    getAlerts(fetch, { acknowledged: false, limit: 10 })
  ])
  return {
    dashboard: dashboard.status === "fulfilled" ? dashboard.value.data : null,
    alerts: alerts.status === "fulfilled" ? alerts.value.data : []
  }
}
