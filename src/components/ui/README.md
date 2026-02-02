# UI Components

This directory contains shadcn/ui components and custom wrappers for consistent styling.

## Canonical Components

### EmptyState (Empty States)

**EmptyState is the CANONICAL component for empty state display** across the application.

#### Variants

- **minimal**: Just text (for inline empty states like LineupSlot)
- **card**: Card with optional icon + text + optional CTA (for contained sections)
- **full-page**: Large icon + text + primary CTA (for full-page empty states)

#### Usage

For inline empty states:

```tsx
import { EmptyState } from '@/components/ui/empty-state'

<EmptyState
  variant="minimal"
  title="Empty slot"
/>
```

For card-based empty states:

```tsx
<EmptyState
  variant="card"
  icon={Trophy}
  title="No leagues connected"
  description="Connect your Sleeper fantasy league to get started"
  action={{
    label: "Connect League",
    href: "/connect"
  }}
/>
```

For full-page empty states:

```tsx
<EmptyState
  variant="full-page"
  icon={Trophy}
  title="No leagues connected"
  description="Connect your Sleeper fantasy league to unlock powerful analysis tools"
  action={{
    label: "Connect Your League",
    href: "/connect"
  }}
/>
```

#### Props

- `variant`: 'minimal' | 'card' | 'full-page' (default: 'card')
- `icon`: LucideIcon component (optional)
- `title`: string (required)
- `description`: string (optional)
- `action`: { label: string; onClick?: () => void; href?: string } (optional)
- `className`: string (optional, for additional styling)

#### Styling

- **Minimal**: Hidden icon, small text, minimal spacing
- **Card**: Wrapped in Card component, medium icon, centered text
- **Full-page**: Large icon, large text, primary button CTA

### Alert (Error Display)

**Alert is the CANONICAL component for error display** across the application.

#### Usage

For simple error messages, use the `ErrorAlert` wrapper:

```tsx
import { ErrorAlert } from '@/components/ui/error-alert'

export function MyComponent() {
  const [error, setError] = useState<string | null>(null)
  
  return (
    <>
      {error && <ErrorAlert message={error} />}
      {/* rest of component */}
    </>
  )
}
```

For custom error titles:

```tsx
<ErrorAlert message="Failed to load data" title="Load Error" />
```

#### Direct Alert Usage

For more control, use the Alert component directly:

```tsx
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

<Alert variant="destructive" aria-live="polite">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong</AlertDescription>
</Alert>
```

#### Styling

- **Variant**: Use `variant="destructive"` for errors
- **Icon**: Always include `AlertCircle` icon from lucide-react
- **Accessibility**: Include `aria-live="polite"` for dynamic errors
- **Dark mode**: Styling is automatically handled by the Alert component

## Anti-Patterns

❌ **DO NOT** use custom div/Card error styling:
```tsx
// WRONG - custom styling
<div className="bg-destructive/10 border border-destructive/20 p-4">
  Error message
</div>

// WRONG - custom Card styling
<Card className="p-4 border-red-200 bg-red-50">
  Error message
</Card>
```

✅ **DO** use ErrorAlert or Alert component:
```tsx
// RIGHT
<ErrorAlert message="Error message" />
```

## Migration Notes

All error display patterns have been standardized to use the Alert component:
- Custom Card patterns (bg-red-50, border-red-200) → ErrorAlert
- Custom div patterns (bg-destructive/10) → ErrorAlert
- Canonical Alert usage (trade-client.tsx) → Reference implementation

See `error-alert.tsx` for the wrapper implementation.
