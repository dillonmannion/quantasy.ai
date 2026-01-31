# SVG Visualization Components

This directory contains the canonical conventions and shared utilities for all SVG visualization components in the application.

## Overview

SVG visualizations provide interactive, accessible data representations. This module establishes the foundational patterns that all visualization components must follow.

**This is a PIONEERING pattern** - no SVG components existed in the codebase before this. These conventions are the canonical reference for all future visualization work.

## Core Conventions

### 1. Component Structure

All SVG visualization components must:

- Be **client components** (`'use client'` directive)
- Accept props extending `SVGVisualizationProps` or a specialized variant
- Return an `<svg>` element with proper accessibility attributes
- Use named exports only (no default exports)
- Be exported from `index.ts` barrel file

### 2. Sizing and Responsiveness

```typescript
// Props
interface SVGVisualizationProps {
  width: number;      // SVG width in pixels
  height: number;     // SVG height in pixels
  className?: string; // Optional container classes
}

// Usage
<LineChart
  width={800}
  height={400}
  className="w-full h-auto"
  data={data}
  ariaLabel="Sales trend over time"
/>
```

**Responsive Strategy:**
- Component accepts fixed pixel dimensions
- Parent container controls responsive sizing via CSS
- Use `viewBox` attribute for scalable SVG content
- Consider `preserveAspectRatio="xMidYMid meet"` for aspect ratio preservation

### 3. Color Handling

**MUST use CSS variables from the design system. NO inline colors.**

Available color variables (from `globals.css`):

```css
/* Chart colors (primary palette) */
--chart-1: oklch(0.85 0.2 85)    /* Yellow/Gold */
--chart-2: oklch(0.65 0.25 290)  /* Purple */
--chart-3: oklch(0.7 0.2 160)    /* Cyan/Teal */
--chart-4: oklch(0.65 0.25 25)   /* Red/Orange */
--chart-5: oklch(0.7 0.25 210)   /* Blue */

/* Semantic colors */
--primary: oklch(0.85 0.2 85)
--accent: oklch(0.65 0.25 290)
--destructive: oklch(0.65 0.25 25)
--foreground: oklch(0.98 0 0)
--muted-foreground: oklch(0.65 0 0)
```

**Usage in SVG:**

```tsx
// ✅ CORRECT: Use CSS variables
<line
  x1={x1}
  y1={y1}
  x2={x2}
  y2={y2}
  stroke="var(--chart-1)"
  strokeWidth={2}
/>

// ❌ WRONG: Inline colors
<line stroke="#ffd700" />
```

**Dynamic Colors:**

For components that need multiple colors, pass CSS variable names as strings:

```typescript
interface ChartVisualizationProps extends SVGVisualizationProps {
  colors?: string[]; // e.g., ['var(--chart-1)', 'var(--chart-2)']
}

// Usage
<BarChart
  colors={['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)']}
  data={data}
  ariaLabel="Revenue by quarter"
/>
```

### 4. Accessibility

**All SVG visualizations must be accessible to screen readers and keyboard users.**

#### Required Attributes

```tsx
<svg
  role="img"
  aria-label="Sales trend over time"
  width={800}
  height={400}
  viewBox="0 0 800 400"
>
  {/* Always include a title element */}
  <title>Sales trend over time</title>
  
  {/* Content */}
</svg>
```

#### Accessibility Checklist

- ✅ `role="img"` on the `<svg>` element
- ✅ `aria-label` describing the visualization (required prop)
- ✅ `<title>` element inside SVG (optional but recommended)
- ✅ Semantic HTML for interactive elements (buttons, links)
- ✅ Keyboard navigation for interactive visualizations
- ✅ Color not the only means of conveying information (use patterns, labels)
- ✅ Sufficient contrast ratios (OKLch colors meet WCAG AA)

#### Example: Accessible Bar Chart

```tsx
<svg role="img" aria-label="Q1-Q4 revenue comparison">
  <title>Q1-Q4 revenue comparison</title>
  
  {/* Bars with data attributes for screen readers */}
  {data.map((item, i) => (
    <g key={item.id}>
      <rect
        x={x(i)}
        y={y(item.value)}
        width={barWidth}
        height={height - y(item.value)}
        fill="var(--chart-1)"
        role="img"
        aria-label={`${item.label}: $${item.value}`}
      />
      <text x={x(i)} y={height + 20}>
        {item.label}
      </text>
    </g>
  ))}
</svg>
```

### 5. Animation

**Use CSS transitions, not motion/react. Respect `prefers-reduced-motion`.**

#### CSS Transitions (Preferred)

```tsx
// In component file or CSS module
const styles = `
  .chart-bar {
    transition: all 300ms ease-in-out;
  }
  
  .chart-bar:hover {
    opacity: 0.8;
    filter: brightness(1.1);
  }
  
  @media (prefers-reduced-motion: reduce) {
    .chart-bar {
      transition: none;
    }
  }
`;

// In component
<rect
  className="chart-bar"
  x={x}
  y={y}
  width={w}
  height={h}
  fill="var(--chart-1)"
/>
```

#### Animation Configuration

```typescript
interface SVGAnimationConfig {
  duration: number;        // milliseconds
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  delay?: number;
  repeat?: boolean;
}

// Respect prefers-reduced-motion
const shouldAnimate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const animationDuration = shouldAnimate ? 300 : 0;
```

#### Animation Keyframes

Available keyframes in `globals.css`:

```css
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes kaching-float {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-100px) scale(1.2); opacity: 0; }
}
```

### 6. TypeScript Interfaces

All visualization components must use TypeScript interfaces from `types.ts`:

```typescript
import {
  SVGVisualizationProps,
  ChartVisualizationProps,
  GraphVisualizationProps,
  HeatmapVisualizationProps,
  SVGStyleOptions,
  SVGAnimationConfig,
} from './types'

// Example component
export function LineChart(props: ChartVisualizationProps) {
  const { data, width, height, ariaLabel, colors = ['var(--chart-1)'] } = props
  
  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <title>{ariaLabel}</title>
      {/* Implementation */}
    </svg>
  )
}
```

## Creating a New Visualization Component

### Step 1: Define Props Interface

Extend the appropriate base interface in `types.ts`:

```typescript
export interface LineChartProps extends ChartVisualizationProps {
  // Add component-specific props
  showGrid?: boolean;
  showLegend?: boolean;
}
```

### Step 2: Create Component File

Create `src/components/visualization/[name].tsx`:

```typescript
'use client'

import { LineChartProps } from './types'
import { cn } from '@/lib/utils'

export function LineChart({
  data,
  width,
  height,
  ariaLabel,
  className,
  colors = ['var(--chart-1)'],
}: LineChartProps) {
  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('visualization-line-chart', className)}
    >
      <title>{ariaLabel}</title>
      {/* Implementation */}
    </svg>
  )
}
```

### Step 3: Export from Barrel

Add to `src/components/visualization/index.ts`:

```typescript
export { LineChart } from './line-chart'
```

### Step 4: Test Accessibility

- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Test keyboard navigation
- [ ] Verify color contrast (WCAG AA minimum)
- [ ] Test with `prefers-reduced-motion` enabled

## Design System Integration

### OKLch Color Space

All colors use OKLch (Oklch) color space for perceptually uniform colors:

- **L** (Lightness): 0-1 (0 = black, 1 = white)
- **C** (Chroma): 0-0.4 (saturation)
- **h** (Hue): 0-360 (color angle)

Example: `oklch(0.85 0.2 85)` = bright yellow

### Balatro Theme

The application uses a dark Balatro-inspired theme:

- Background: `oklch(0.12 0.02 270)` (very dark blue)
- Card: `oklch(0.18 0.02 270)` (dark blue)
- Text: `oklch(0.98 0 0)` (near white)
- Accents: Gold, Purple, Cyan, Red, Blue

## Performance Considerations

- **SVG Size**: Keep SVG markup minimal. Use `<g>` for grouping.
- **Rendering**: Avoid excessive DOM nodes. Consider canvas for 1000+ data points.
- **Animations**: Use CSS transitions (GPU-accelerated) over JavaScript animations.
- **Responsive**: Use `viewBox` for scalability without re-rendering.

## Testing

### Unit Tests

```typescript
import { render, screen } from '@testing-library/react'
import { LineChart } from './line-chart'

describe('LineChart', () => {
  it('renders with proper accessibility attributes', () => {
    render(
      <LineChart
        data={[{ x: 0, y: 10 }]}
        width={400}
        height={300}
        ariaLabel="Test chart"
      />
    )
    
    expect(screen.getByRole('img', { name: /test chart/i })).toBeInTheDocument()
    expect(screen.getByTitle(/test chart/i)).toBeInTheDocument()
  })
})
```

### E2E Tests

```typescript
test('line chart is interactive', async ({ page }) => {
  await page.goto('/dashboard/analytics')
  
  const chart = page.locator('[role="img"][aria-label*="Sales"]')
  await expect(chart).toBeVisible()
  
  // Test hover interactions
  await chart.hover()
  await expect(page.locator('.tooltip')).toBeVisible()
})
```

## Common Patterns

### Responsive Container

```tsx
<div className="w-full h-96">
  <LineChart
    data={data}
    width={800}
    height={400}
    ariaLabel="Sales trend"
  />
</div>
```

### With Legend

```tsx
<div className="flex gap-4">
  <LineChart
    data={data}
    width={600}
    height={400}
    ariaLabel="Sales by region"
    colors={['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)']}
  />
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <div className="w-4 h-4" style={{ backgroundColor: 'var(--chart-1)' }} />
      <span>Region A</span>
    </div>
    {/* More legend items */}
  </div>
</div>
```

### With Tooltip

```tsx
const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)

return (
  <>
    <LineChart
      data={data}
      width={800}
      height={400}
      ariaLabel="Sales trend"
      onDataPointClick={(point, index) => setHoveredPoint(index)}
    />
    {hoveredPoint !== null && (
      <Tooltip point={data[hoveredPoint]} />
    )}
  </>
)
```

## References

- [MDN: SVG Accessibility](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/SVG_and_CSS)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [OKLch Color Space](https://oklch.com/)
- [CSS Transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Transitions)
- [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)

## Checklist for New Components

- [ ] Extends appropriate interface from `types.ts`
- [ ] Has `'use client'` directive
- [ ] Returns `<svg role="img" aria-label={...}>`
- [ ] Includes `<title>` element
- [ ] Uses CSS variables for colors (no inline colors)
- [ ] Respects `prefers-reduced-motion`
- [ ] Exported from `index.ts`
- [ ] Has unit tests with accessibility checks
- [ ] Has E2E tests for interactive features
- [ ] Documented in this README
