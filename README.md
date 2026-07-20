# bookie-breaker-ui

Web dashboard for visualizing edges, predictions, line movement, simulation distributions, and paper
trading performance, with live updates and a streaming LLM analyst chat.

For a guided tour of the dashboard and the full edge-to-bet workflow, see the operator playbooks
[02-daily-operations](https://github.com/Bookie-Breaker/bookie-breaker-docs/blob/main/playbooks/02-daily-operations.md)
and [03-finding-and-betting-edges](https://github.com/Bookie-Breaker/bookie-breaker-docs/blob/main/playbooks/03-finding-and-betting-edges.md).

## Quickstart

### With Docker Compose (recommended)

```bash
task up  # from BookieBreaker/ root — serves http://localhost:3000
```

### Standalone

```bash
cp .env.example .env  # fill in values
task bootstrap
task dev
```

## Architecture

- All backend access happens **server-side** (load functions + an allowlist of `/api` proxy routes);
  the browser never talks to services directly and no service URL is exposed to the client.
- Live updates: one shared Redis subscriber bridges `events:*` pub/sub to browsers via `GET
/api/events` (SSE); pages refetch on events rather than rendering payloads. Without `REDIS_URL`
  the bridge degrades to heartbeats.
- Chat: `POST /api/chat` pipes the agent's streaming analysis SSE straight through, with a JSON
  fallback for degraded agents.
- API types are generated from the docs repo's OpenAPI specs: `pnpm gen:api` (requires
  `bookie-breaker-docs` checked out as a sibling; output is committed).
- Health for the compose healthcheck: `GET /healthz`.

## Decisions

- [Tech Stack Selection (ADR-010)](https://github.com/Bookie-Breaker/bookie-breaker-docs/blob/main/decisions/010-tech-stack-selection.md)
- [UI API Client Strategy (ADR-016)](https://github.com/Bookie-Breaker/bookie-breaker-docs/blob/main/decisions/016-ui-api-client-strategy.md)
- [LLM Chat Interface Placement (ADR-017)](https://github.com/Bookie-Breaker/bookie-breaker-docs/blob/main/decisions/017-llm-chat-interface-placement.md)

Note: charts use echarts directly behind a small `Chart.svelte` wrapper rather than the
`svelte-echarts` package ADR-010 mentions — the wrapper is ~40 lines and the package is unmaintained.

## Testing

```bash
task test          # vitest: tests/unit + tests/integration (msw-mocked upstreams)
task test:e2e      # playwright against a stub backend (no Docker stack needed)
BB_E2E_STACK=1 pnpm exec playwright test --project=full-stack  # against task up
```

## Environment Variables

See `.env.example`. All URLs are read server-side only (`$env/dynamic/private`).
