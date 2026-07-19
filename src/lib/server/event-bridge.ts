/**
 * One shared Redis subscriber fanned out to every open SSE connection.
 *
 * Pub/sub is fire-and-forget by design (redis-schemas.md): payloads carry
 * identifiers only and consumers refetch via REST, so a dropped event is
 * healed by the client's reconnect invalidation. Without REDIS_URL the
 * bridge reports unavailable and /api/events degrades to heartbeats.
 */
import Redis from "ioredis"

import { redisUrl } from "$lib/server/env"

export const CHANNELS = [
  "events:edge.detected",
  "events:parlay.detected",
  "events:prediction.completed",
  "events:lines.updated",
  "events:game.completed",
  "events:bet.graded"
] as const

export type BridgeListener = (event: string, payload: string) => void

let subscriber: Redis | null = null
const listeners = new Set<BridgeListener>()

function ensureSubscriber(): Redis | null {
  if (subscriber) return subscriber
  const url = redisUrl()
  if (!url) return null
  subscriber = new Redis(url, {
    lazyConnect: false,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(30_000, 500 * 2 ** times)
  })
  subscriber.on("error", (error) => {
    console.warn("event-bridge redis error:", error.message)
  })
  subscriber.subscribe(...CHANNELS).catch((error: Error) => {
    console.warn("event-bridge subscribe failed:", error.message)
  })
  subscriber.on("message", (channel: string, message: string) => {
    const event = channel.replace(/^events:/, "")
    for (const listener of listeners) {
      listener(event, message)
    }
  })
  return subscriber
}

/** True when a Redis URL is configured (the bridge can deliver events). */
export function bridgeConfigured(): boolean {
  return redisUrl() !== null
}

/** Register a fan-out listener; returns the unsubscribe function. */
export function onBridgeEvent(listener: BridgeListener): () => void {
  ensureSubscriber()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
