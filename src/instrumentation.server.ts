/**
 * OTEL bootstrap (ADR-012), loaded before app code via SvelteKit's
 * experimental server instrumentation hook. No-op unless
 * OTEL_EXPORTER_OTLP_ENDPOINT is set (same pattern as the agent) —
 * exporters ship traces/metrics/logs to the otel-collector.
 */
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc"
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc"
import { resourceFromAttributes } from "@opentelemetry/resources"
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs"
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics"
import { NodeSDK } from "@opentelemetry/sdk-node"
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions"

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT

if (endpoint) {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? "ui",
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? "0.1.0"
    }),
    traceExporter: new OTLPTraceExporter(),
    metricReader: new PeriodicExportingMetricReader({ exporter: new OTLPMetricExporter() }),
    logRecordProcessors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })],
    instrumentations: [
      getNodeAutoInstrumentations({
        // http + undici cover inbound requests and upstream fetches;
        // ioredis covers the SSE bridge. fs is pure noise.
        "@opentelemetry/instrumentation-fs": { enabled: false }
      })
    ]
  })
  sdk.start()
  console.log(`otel: exporting to ${endpoint}`)

  const shutdown = () => {
    sdk.shutdown().catch(() => undefined)
  }
  process.once("SIGTERM", shutdown)
  process.once("SIGINT", shutdown)
} else {
  console.log("otel: OTEL_EXPORTER_OTLP_ENDPOINT unset; instrumentation disabled")
}
