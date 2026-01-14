# Project Rules for Claude

## Styling Pattern

This project uses Tailwind CSS v4 with custom component classes defined in `src/styles/app.css`. **Always use CSS utility classes from `@layer components` instead of inline Tailwind utilities for common patterns.**

### Available Design System Classes

#### Hover States
| Class | Use For | Expands To |
|-------|---------|------------|
| `hover-subtle` | Table rows, list items | `hover:bg-neutral-50` |
| `hover-medium` | Buttons, icon buttons | `hover:bg-neutral-100` |

#### Border Patterns
| Class | Use For | Expands To |
|-------|---------|------------|
| `border-card` | Card/container wrappers | `border border-neutral-200 bg-white` |
| `border-input` | Input fields, selects, filter buttons | `border border-neutral-200 bg-neutral-50` |
| `border-divider` | Dividers, separators | `border-neutral-200` |

#### Interactive Elements
| Class | Use For | Expands To |
|-------|---------|------------|
| `interactive-row` | Clickable table/list rows | `cursor-pointer hover:bg-neutral-50` |
| `interactive-icon-button` | Icon-only buttons | `text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600` |

### Usage Examples

```tsx
// Card container
<div className="border-card">...</div>

// Table with interactive rows
<table className="w-full text-xs">
  <tbody>
    {items.map((item) => (
      <tr key={item.id} className="interactive-row">...</tr>
    ))}
  </tbody>
</table>

// Input field
<input className="h-7 border-input px-2 text-xs" />

// Filter/select button
<button className="h-7 border-input px-2 text-xs hover-medium">...</button>

// Pagination button
<button className="flex size-7 items-center justify-center border border-divider hover-subtle">
```

### Adding New Patterns

When you identify a repeated styling pattern:

1. Add the class to `src/styles/app.css` in the `@layer components` section
2. Use the `@apply` directive to compose Tailwind utilities
3. Add a comment describing when to use it
4. Update this documentation

```css
@layer components {
  /* Description of when to use this class */
  .new-pattern {
    @apply /* tailwind utilities */;
  }
}
```

### Do NOT

- Use inline Tailwind utilities for hover states like `hover:bg-neutral-50` or `hover:bg-neutral-100` directly - use `hover-subtle` or `hover-medium`
- Use inline border patterns like `border border-neutral-200 bg-white` - use `border-card`
- Create TypeScript style constants - all shared styles belong in CSS
- Add styles to `utils.ts` - the `cn()` function is only for class merging

### File Locations

- CSS design system: `src/styles/app.css` (in `@layer components`)
- Class merging utility: `src/lib/tailwind/utils.ts` (only exports `cn()`)
