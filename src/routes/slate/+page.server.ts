import { getSlate } from "$lib/server/api/agent"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ fetch, depends, url }) => {
  depends("app:slate")
  const slate = await getSlate(fetch, {
    league: url.searchParams.get("league") ?? undefined,
    date: url.searchParams.get("date") ?? undefined
  })
  return { slate: slate.data }
}
