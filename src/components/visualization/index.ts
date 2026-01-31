/**
 * SVG Visualization Components Barrel Export
 * 
 * This is the canonical entry point for all SVG visualization components.
 * All visualization components must be exported here.
 * 
 * Pattern: Follow the same structure as src/components/animation/index.ts
 * 
 * Usage:
 *   import { LineChart, BarChart } from '@/components/visualization'
 */

// Types and utilities
export type {
  SVGVisualizationProps,
  ChartVisualizationProps,
  GraphVisualizationProps,
  HeatmapVisualizationProps,
  SVGStyleOptions,
  SVGAnimationConfig,
} from './types'

// Components will be added here as they are created
// Example:
// export { LineChart } from './line-chart'
// export { BarChart } from './bar-chart'
// export { AreaChart } from './area-chart'
// export { HeatmapChart } from './heatmap-chart'
// export { NetworkGraph } from './network-graph'
export { FairnessBarSVG } from './fairness-bar-svg'
export { Sparkline } from './sparkline'

