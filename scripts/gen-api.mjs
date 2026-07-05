/**
 * Generate TypeScript types from the committed OpenAPI specs (ADR-016/021).
 *
 * Reads every spec in ../bookie-breaker-docs/api-contracts/openapi/ and
 * writes types-only modules to src/lib/api/gen/. The output is committed;
 * CI never runs this (it needs the docs repo checked out as a sibling).
 *
 * Usage: pnpm gen:api
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync } from "node:fs"
import { basename, join, resolve } from "node:path"

const specsDir = resolve(import.meta.dirname, "../../bookie-breaker-docs/api-contracts/openapi")
const outDir = resolve(import.meta.dirname, "../src/lib/api/gen")

if (!existsSync(specsDir)) {
  console.error(
    `OpenAPI specs not found at ${specsDir}.\n` +
      "Clone bookie-breaker-docs as a sibling of this repo and retry."
  )
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })

const specs = readdirSync(specsDir).filter((file) => file.endsWith(".yaml"))
if (specs.length === 0) {
  console.error(`No .yaml specs found in ${specsDir}`)
  process.exit(1)
}

for (const spec of specs) {
  const name = basename(spec, ".yaml")
  const outFile = join(outDir, `${name}.ts`)
  console.log(`${spec} -> src/lib/api/gen/${name}.ts`)
  execFileSync("pnpm", ["exec", "openapi-typescript", join(specsDir, spec), "-o", outFile], {
    stdio: "inherit"
  })
}

execFileSync(
  "pnpm",
  ["exec", "prettier", "--config", ".config/prettierrc.json", "--write", outDir],
  {
    stdio: "inherit"
  }
)
console.log(`Generated ${specs.length} type modules.`)
