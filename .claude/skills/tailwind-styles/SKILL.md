---
name: tailwind-styles
description: Use when styling components with Tailwind CSS, creating consistent design patterns, or setting up design system classes in CSS layers
---

# Tailwind Styles

## Overview

Patterns for consistent styling with Tailwind CSS v4, using CSS component layers for reusable patterns instead of inline utilities.

## Core Principle

**Use CSS `@layer components` for repeated patterns. Never inline repetitive utilities.**

## Design System Classes

Define patterns in `src/styles/app.css`:

```css
@layer components {
  /* Hover States */
  .hover-subtle {
    @apply hover:bg-neutral-50;
  }

  .hover-medium {
    @apply hover:bg-neutral-100;
  }

  /* Border Patterns */
  .border-card {
    @apply border border-neutral-200 bg-white;
  }

  .border-input {
    @apply border border-neutral-200 bg-neutral-50;
  }

  .border-divider {
    @apply border-neutral-200;
  }

  /* Interactive Elements */
  .interactive-row {
    @apply cursor-pointer hover:bg-neutral-50;
  }

  .interactive-icon-button {
    @apply text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600;
  }
}
```

## Usage Patterns

### Card Container

```tsx
// Good - uses design system class
<div className="border-card rounded-lg p-4">
  {children}
</div>

// Bad - inline utilities
<div className="border border-neutral-200 bg-white rounded-lg p-4">
  {children}
</div>
```

### Interactive Table Row

```tsx
// Good
<tr className="interactive-row">
  <td>{data.name}</td>
</tr>

// Bad
<tr className="cursor-pointer hover:bg-neutral-50">
  <td>{data.name}</td>
</tr>
```

### Form Input

```tsx
// Good
<input className="h-7 border-input px-2 text-xs" />

// Bad
<input className="h-7 border border-neutral-200 bg-neutral-50 px-2 text-xs" />
```

### Icon Button

```tsx
// Good
<button className="interactive-icon-button p-1 rounded">
  <Icon />
</button>

// Bad
<button className="text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 p-1 rounded">
  <Icon />
</button>
```

## Adding New Patterns

When you identify a pattern used 3+ times:

1. Add to `src/styles/app.css` in `@layer components`
2. Use `@apply` to compose Tailwind utilities
3. Add descriptive comment
4. Update documentation

```css
@layer components {
  /* Sticky table header */
  .sticky-header {
    @apply sticky top-0 bg-white shadow-sm;
  }

  /* Truncated text with tooltip */
  .truncate-tooltip {
    @apply truncate max-w-[200px];
  }
}
```

## Class Merging

Use `cn()` from `@/lib/tailwind/utils` to merge classes:

```tsx
import { cn } from '@/lib/tailwind/utils';

function Button({ className, variant }) {
  return (
    <button className={cn(
      'px-4 py-2 rounded',
      variant === 'primary' && 'bg-blue-500 text-white',
      variant === 'secondary' && 'border-input',
      className
    )}>
      {children}
    </button>
  );
}
```

## Quick Reference

| Pattern | Class | Use For |
|---------|-------|---------|
| Subtle hover | `hover-subtle` | Table rows, list items |
| Medium hover | `hover-medium` | Buttons, clickable areas |
| Card border | `border-card` | Containers, cards |
| Input border | `border-input` | Inputs, selects, filters |
| Divider | `border-divider` | Separators |
| Clickable row | `interactive-row` | Table/list rows |
| Icon button | `interactive-icon-button` | Icon-only buttons |

## Do NOT

- Use inline `hover:bg-neutral-*` - use `hover-subtle` or `hover-medium`
- Use inline `border border-neutral-200 bg-white` - use `border-card`
- Create TypeScript style constants
- Add styles to `utils.ts`
- Duplicate the same utility combination

## Common Mistakes

1. **Not checking existing patterns** - Always search `app.css` first
2. **Creating one-off patterns** - Only add to layer if used 3+ times
3. **Forgetting dark mode** - Consider `dark:` variants in patterns
4. **Over-abstracting** - Keep patterns simple and composable
