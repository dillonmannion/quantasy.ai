/**
 * Shared TypeScript interfaces for SVG visualization components.
 * 
 * This module defines the canonical prop interfaces that all SVG visualization
 * components must follow. These conventions ensure consistency, accessibility,
 * and maintainability across the visualization system.
 */

/**
 * Base props for all SVG visualization components.
 * 
 * Every SVG component should extend this interface to ensure:
 * - Consistent sizing and styling
 * - Proper accessibility attributes
 * - Responsive behavior
 */
export interface SVGVisualizationProps {
  /** The data to visualize. Shape depends on specific component. */
  data: unknown;

  /** SVG width in pixels. Responsive: use container queries or parent sizing. */
  width: number;

  /** SVG height in pixels. Responsive: use container queries or parent sizing. */
  height: number;

  /** Optional CSS class names for styling the SVG container. */
  className?: string;

  /** Accessibility label describing the visualization. Required for screen readers. */
  ariaLabel: string;

  /** Optional title for the SVG. Displayed on hover and read by screen readers. */
  title?: string;
}

/**
 * Props for chart-like visualizations (line, bar, area, etc.).
 * 
 * Extends SVGVisualizationProps with chart-specific properties.
 */
export interface ChartVisualizationProps extends SVGVisualizationProps {
  /** Data points for the chart. */
  data: Array<Record<string, number | string>>;

  /** Optional color palette. Uses CSS variable names (e.g., 'var(--chart-1)'). */
  colors?: string[];

  /** Optional animation duration in milliseconds. Respects prefers-reduced-motion. */
  animationDuration?: number;

  /** Optional callback when a data point is clicked. */
  onDataPointClick?: (dataPoint: Record<string, number | string>, index: number) => void;
}

/**
 * Props for network/graph visualizations (nodes, edges, etc.).
 * 
 * Extends SVGVisualizationProps with graph-specific properties.
 */
export interface GraphVisualizationProps extends SVGVisualizationProps {
  /** Nodes in the graph. */
  data: {
    nodes: Array<{ id: string; label: string; [key: string]: unknown }>;
    edges: Array<{ source: string; target: string; [key: string]: unknown }>;
  };

  /** Optional color for nodes. Uses CSS variable names. */
  nodeColor?: string;

  /** Optional color for edges. Uses CSS variable names. */
  edgeColor?: string;

  /** Optional callback when a node is clicked. */
  onNodeClick?: (nodeId: string) => void;
}

/**
 * Props for heatmap visualizations.
 * 
 * Extends SVGVisualizationProps with heatmap-specific properties.
 */
export interface HeatmapVisualizationProps extends SVGVisualizationProps {
  /** 2D array of numeric values. */
  data: number[][];

  /** Optional color scale. Uses CSS variable names. */
  colorScale?: string[];

  /** Optional minimum value for color scaling. Defaults to min of data. */
  minValue?: number;

  /** Optional maximum value for color scaling. Defaults to max of data. */
  maxValue?: number;

  /** Optional labels for rows. */
  rowLabels?: string[];

  /** Optional labels for columns. */
  columnLabels?: string[];
}

/**
 * Common styling options for SVG elements.
 * 
 * Use these to ensure consistent styling across all visualization components.
 */
export interface SVGStyleOptions {
  /** Stroke color. Use CSS variable names (e.g., 'var(--chart-1)'). */
  strokeColor?: string;

  /** Stroke width in pixels. */
  strokeWidth?: number;

  /** Fill color. Use CSS variable names. */
  fillColor?: string;

  /** Opacity (0-1). */
  opacity?: number;
}

/**
 * Animation configuration for SVG visualizations.
 * 
 * All animations must respect prefers-reduced-motion.
 */
export interface SVGAnimationConfig {
  /** Duration of animation in milliseconds. */
  duration: number;

  /** Easing function name (e.g., 'ease-in-out', 'linear'). */
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

  /** Delay before animation starts in milliseconds. */
  delay?: number;

  /** Whether to repeat animation. */
  repeat?: boolean;
}
