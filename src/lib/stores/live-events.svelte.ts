/**
 * Live updates: one EventSource against /api/events, mapping Redis events
 * to debounced invalidate() calls. Event payloads are never rendered —
 * server load functions refetch the truth (which also sidesteps the
 * fraction-vs-points edge_percentage mismatch between events and REST).
 */
import { invalidate, invalidateAll } from "$app/navigation"

import { toasts } from "$lib/stores/toasts.svelte"
import { edgeFractionToPoints } from "$lib/utils/odds"

const DEBOUNCE_MS = 1_500

export const EVENT_INVALIDATIONS: Record<string, string[]> = {
  "edge.detected": ["app:edges", "app:dashboard", "app:slate"],
  "parlay.detected": ["app:parlays"],
  "bet.graded": ["app:bets", "app:performance", "app:dashboard"],
  "lines.updated": ["app:lines", "app:slate"],
  "prediction.completed": ["app:slate", "app:edges"],
  "game.completed": ["app:slate", "app:dashboard"]
}

class LiveEvents {
  status = $state<"connecting" | "connected" | "disconnected">("disconnected")
  eventCount = $state(0)

  #source: EventSource | null = null
  #timers = new Map<string, ReturnType<typeof setTimeout>>()
  #hadError = false

  start(): void {
    if (this.#source) return
    this.status = "connecting"
    const source = new EventSource("/api/events")
    this.#source = source

    source.addEventListener("open", () => {
      this.status = "connected"
      if (this.#hadError) {
        // Missed events are unrecoverable by design; a full refetch heals.
        void invalidateAll()
        this.#hadError = false
      }
    })
    source.addEventListener("error", () => {
      this.status = "disconnected"
      this.#hadError = true
    })

    for (const event of Object.keys(EVENT_INVALIDATIONS)) {
      source.addEventListener(event, (message) => this.#handle(event, message as MessageEvent))
    }
  }

  stop(): void {
    this.#source?.close()
    this.#source = null
    this.status = "disconnected"
    for (const timer of this.#timers.values()) clearTimeout(timer)
    this.#timers.clear()
  }

  #handle(event: string, message: MessageEvent): void {
    this.eventCount += 1
    for (const key of EVENT_INVALIDATIONS[event] ?? []) {
      this.#debouncedInvalidate(key)
    }
    this.#toast(event, message.data as string)
  }

  #debouncedInvalidate(key: string): void {
    const existing = this.#timers.get(key)
    if (existing) clearTimeout(existing)
    this.#timers.set(
      key,
      setTimeout(() => {
        this.#timers.delete(key)
        void invalidate(key)
      }, DEBOUNCE_MS)
    )
  }

  #toast(event: string, raw: string): void {
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return
    }
    if (event === "edge.detected") {
      const points = edgeFractionToPoints(Number(payload.edge_percentage ?? 0))
      toasts.add(`New edge: ${String(payload.selection ?? "?")} +${points.toFixed(1)}%`, {
        href: payload.edge_id ? `/edges/${String(payload.edge_id)}` : undefined,
        tone: "success"
      })
    } else if (event === "parlay.detected") {
      // ev_pct is already percentage points in this payload (redis-schemas.md).
      const ev = Number(payload.ev_pct ?? 0)
      toasts.add(
        `Parlay detected: ${String(payload.leg_count ?? "?")}-leg ${String(payload.league ?? "?")} +${ev.toFixed(1)}% EV`,
        { href: "/parlay", tone: "success" }
      )
    } else if (event === "bet.graded") {
      const result = String(payload.result ?? "?")
      toasts.add(`Bet graded ${result}: ${String(payload.selection ?? "?")}`, {
        href: payload.bet_id ? `/bets/${String(payload.bet_id)}` : undefined,
        tone: result === "WIN" ? "success" : result === "LOSS" ? "error" : "info"
      })
    }
  }
}

export const liveEvents = new LiveEvents()
