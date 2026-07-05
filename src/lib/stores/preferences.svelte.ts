/**
 * Client-side UI preferences persisted to localStorage (UI-018).
 * Server data never lives here — load functions own that.
 */
import { browser } from "$app/environment"

export type Mode = "light" | "dark"

const MODE_KEY = "bb:mode"
const LEAGUE_KEY = "bb:league"

function readMode(): Mode {
  if (!browser) return "dark"
  const stored = localStorage.getItem(MODE_KEY)
  return stored === "light" || stored === "dark" ? stored : "dark"
}

function readLeague(): string {
  if (!browser) return ""
  return localStorage.getItem(LEAGUE_KEY) ?? ""
}

class Preferences {
  mode = $state<Mode>(readMode())
  /** Default league filter; empty string = all leagues. */
  league = $state<string>(readLeague())

  toggleMode(): void {
    this.mode = this.mode === "dark" ? "light" : "dark"
    if (browser) {
      document.documentElement.dataset.mode = this.mode
      localStorage.setItem(MODE_KEY, this.mode)
    }
  }

  setLeague(league: string): void {
    this.league = league
    if (browser) {
      localStorage.setItem(LEAGUE_KEY, league)
    }
  }
}

export const preferences = new Preferences()
