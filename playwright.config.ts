import { defineConfig, devices } from "@playwright/test"

/**
 * E2E against the BUILT app pointed at tests/e2e/stub-server.mjs — data
 * fetching is server-side, so page.route() cannot mock it; the stub
 * plays every backend. Fully self-contained: no Docker stack, no Redis
 * (the SSE bridge degrades to heartbeats).
 *
 * BB_E2E_STACK=1 adds a project that expects the real compose stack
 * (task up) on the default ports — never runs in CI.
 */
const STUB_PORT = 9200
const APP_PORT = 3100
const stubUrl = `http://localhost:${STUB_PORT}`

const stackProjects = process.env.BB_E2E_STACK
  ? [
      {
        name: "full-stack",
        testMatch: /stack\/.*\.spec\.ts/,
        use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000" }
      }
    ]
  : []

export default defineConfig({
  testDir: "tests/e2e",
  testIgnore: process.env.BB_E2E_STACK ? [] : [/stack\//],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }
    },
    {
      name: "chromium-tablet",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } }
    },
    ...stackProjects
  ],
  webServer: [
    {
      command: `node tests/e2e/stub-server.mjs`,
      port: STUB_PORT,
      reuseExistingServer: !process.env.CI,
      env: { STUB_PORT: String(STUB_PORT) }
    },
    {
      command: "pnpm build && node build",
      port: APP_PORT,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: String(APP_PORT),
        ORIGIN: `http://localhost:${APP_PORT}`,
        AGENT_URL: stubUrl,
        BOOKIE_EMULATOR_URL: stubUrl,
        LINES_SERVICE_URL: stubUrl,
        STATISTICS_SERVICE_URL: stubUrl,
        SIMULATION_ENGINE_URL: stubUrl,
        PREDICTION_ENGINE_URL: stubUrl,
        REDIS_URL: ""
      }
    }
  ]
})
