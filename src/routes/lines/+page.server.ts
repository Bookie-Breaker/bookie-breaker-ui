import { getCurrentLines } from "$lib/server/api/lines"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ fetch, depends, url }) => {
  depends("app:lines")
  const page = await getCurrentLines(fetch, {
    league: url.searchParams.get("league") ?? undefined,
    market_type: url.searchParams.get("market_type") ?? undefined,
    limit: 200
  })
  return { lines: page.data }
}
