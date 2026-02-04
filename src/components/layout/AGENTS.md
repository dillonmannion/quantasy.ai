# LAYOUT COMPONENTS

## OVERVIEW

Responsive navigation. Desktop sidebar + mobile bottom nav. Mobile-first design.

## FILES

| File | Export | Purpose |
|------|--------|---------|
| `desktop-sidebar.tsx` | `DesktopSidebar` | Static sidebar for md+ screens |
| `desktop-sidebar-animated.tsx` | `DesktopSidebarAnimated` | Collapsible sidebar with motion |
| `mobile-nav.tsx` | `MobileNav` | Fixed bottom nav for mobile |
| `mobile-nav-animated.tsx` | `MobileNavAnimated` | Bottom nav with motion effects |
| `breadcrumbs.tsx` | `Breadcrumbs` | Page navigation breadcrumbs |
| `user-menu.tsx` | `UserMenu` | Avatar dropdown (logout, settings) |
| `page-container.tsx` | `PageContainer` | Consistent page wrapper |

## USAGE

```typescript
// In (dashboard)/layout.tsx
import { DesktopSidebar } from '@/components/layout/desktop-sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'

<div className="flex min-h-screen">
  <DesktopSidebar className="hidden md:flex" />
  <main className="flex-1 pb-16 md:pb-0">
    {children}
  </main>
  <MobileNav className="md:hidden" />
</div>
```

## RESPONSIVE PATTERN

- **Mobile (< md)**: `MobileNav` fixed at bottom, no sidebar
- **Desktop (md+)**: `DesktopSidebar` on left, no bottom nav
- Use `hidden md:flex` / `md:hidden` for switching

## CONVENTIONS

- All components use `'use client'`
- Direct imports (no barrel export in this directory)
- `cn()` for conditional Tailwind classes
- Animated variants respect `useReducedMotion()`

## NAVIGATION ITEMS

Defined inline in components. Current routes:
- Dashboard (`/dashboard`)
- Draft (`/draft`)
- Roster (`/roster`)
- Trade (`/trade`)
- Waivers (`/waivers`)

## ANTI-PATTERNS

- **DO NOT** add new nav items without updating both mobile + desktop
- **DO NOT** use position: fixed in page content (conflicts with mobile nav)

## MOBILE E2E NOTE

Mobile nav intercepts clicks on page content. E2E tests must use:
```typescript
await element.dispatchEvent('click')  // NOT element.click()
```
