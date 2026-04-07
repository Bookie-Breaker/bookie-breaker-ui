# bookie-breaker-ui

## Service Purpose

TypeScript/SvelteKit web dashboard for visualizing edges, predictions, line movement, simulation distributions, and paper trading performance.

## Language & Conventions

- **Language:** TypeScript (strict mode)
- **Framework:** SvelteKit 2, Svelte 5, Vite
- **Project layout:** `src/routes/` for pages, `src/lib/` for shared code
- **Naming:** `kebab-case.ts` files, `PascalCase.svelte` components, `camelCase` variables
- **Package manager:** pnpm
- **Testing:** Vitest (unit), Playwright (e2e)

## Key Files

- `src/app.html` — HTML shell
- `src/routes/` — SvelteKit pages
- `src/lib/components/` — Reusable Svelte components
- `src/lib/api/` — API client layer
- `src/lib/stores/` — Svelte stores
- `package.json` — Dependencies
- `svelte.config.js` — SvelteKit config

## Service-Specific Commands

```bash
task dev          # Vite dev server with HMR on port 3000
task lint         # eslint + prettier
task test         # vitest run
task test:e2e     # playwright test
task build        # Production build
task check        # svelte-check
```

## Dependencies

- **agent** (port 8006) — Edges, analysis, pipeline status
- **lines-service** (port 8001) — Line data and movement
- **statistics-service** (port 8002) — Game schedules and stats
- **bookie-emulator** (port 8005) — Paper bet history and performance

## Environment Variables

See `.env.example`. Key: `PUBLIC_AGENT_URL`, `PUBLIC_LINES_SERVICE_URL`, `PUBLIC_STATISTICS_SERVICE_URL`, `PUBLIC_BOOKIE_EMULATOR_URL`.
