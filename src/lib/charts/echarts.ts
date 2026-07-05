/** Tree-shaken echarts registration — one place, imported by Chart.svelte. */
import { BarChart, LineChart, ScatterChart } from "echarts/charts"
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent
} from "echarts/components"
import * as echarts from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"

echarts.use([
  BarChart,
  LineChart,
  ScatterChart,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  CanvasRenderer
])

export { echarts }
export type { EChartsCoreOption } from "echarts/core"
