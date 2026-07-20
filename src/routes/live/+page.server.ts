import { getEdges } from "$lib/server/api/agent"
import { getCurrentLines } from "$lib/server/api/lines"
import { filterLiveEdges } from "$lib/utils/live"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ fetch, depends }) => {
  depends("app:live")

  // The agent edges list has no is_live filter param yet — fetch and select
  // client-side on the runtime flag (see $lib/utils/live). allSettled keeps
  // the page rendering when one of the two services is down.
  const [lines, edges] = await Promise.allSettled([
    getCurrentLines(fetch, { is_live: true, limit: 200 }),
    getEdges(fetch, { limit: 200 })
  ])

  return {
    liveLines: lines.status === "fulfilled" ? lines.value.data : [],
    liveEdges: edges.status === "fulfilled" ? filterLiveEdges(edges.value.data) : []
  }
}
