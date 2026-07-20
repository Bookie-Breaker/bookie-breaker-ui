import { sveltekit } from "@sveltejs/kit/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  test: {
    include: ["tests/{unit,integration}/**/*.{test,spec}.{js,ts}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{js,ts,svelte}"],
      exclude: ["src/lib/api/gen/**", "src/**/*.d.ts", "src/instrumentation.server.ts"]
    }
  }
})
