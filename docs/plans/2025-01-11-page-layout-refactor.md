# Page Layout Refactor Design

## Problem

Every page manually rebuilds the same top bar structure:
- Breadcrumbs placed in children slot manually
- End actions rebuilt with divider + NotificationButton pattern
- No distinction between list page headers and detail page headers

## Solution

Add declarative props to `PageLayoutTopBar` that handle common patterns automatically.

## New API

```tsx
<PageLayoutTopBar
  // Breadcrumbs - auto-rendered if provided
  breadcrumbs={[
    { label: 'Signers', href: '/signers' },
    { label: signer.name },
  ]}

  // Title - rendered as h1
  title="Signer Details"

  // Optional subtitle
  subtitle="Last active 2 hours ago"

  // Status badge next to title
  status={<Badge variant="positive">Active</Badge>}

  // Primary CTA(s) - auto-wrapped with divider + NotificationButton
  actions={<Button>Edit Signer</Button>}

  // Escape hatch for full control
  children={...}
/>
```

## Behaviors

| Prop provided | Rendering |
|--------------|-----------|
| `breadcrumbs` + `title` | Breadcrumbs above, title below |
| `title` only | Just the title (h1) |
| `actions` | Buttons + divider + NotificationButton |
| No `actions` | Just NotificationButton |
| `children` | Full override, you control everything |

## Breadcrumbs

- First item can optionally show home icon via `showHomeIcon` prop
- Items with `href` are clickable links
- Last item rendered as plain text (current page)
- Truncation for long labels

## File Structure

```
src/layout/treasury-6/
├── page-layout.tsx          # PageLayout, PageLayoutContent, PageLayoutContainer
├── page-layout-top-bar.tsx  # PageLayoutTopBar, PageLayoutTopBarTitle (new)
├── breadcrumbs.tsx          # Breadcrumbs component (extracted)
└── ...
```

## Migration Strategy

1. Add new props to PageLayoutTopBar (backwards compatible)
2. Migrate one page to new API
3. Verify it works
4. Repeat for remaining pages
5. Remove old children usage patterns
