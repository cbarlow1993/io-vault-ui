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

---

## Testing Standards

This project uses a three-tier testing strategy: **Unit Tests**, **Browser Tests**, and **E2E Tests**.

### Test File Naming

| Test Type | Pattern | Location |
|-----------|---------|----------|
| Unit Tests | `*.unit.spec.ts` | Co-located with source |
| Browser Tests | `*.browser.spec.ts` | Co-located with source |
| E2E Tests | `*.spec.ts` | `e2e/` directory |

### When to Write Tests

- **Unit tests**: Pure functions, utilities, transformations, schema validation
- **Browser tests**: Component rendering, user interactions, hooks
- **E2E tests**: Critical user flows, API integration, auth flows

### Test Structure

```typescript
// Unit test example
describe('parseStringToDate', () => {
  it.each([
    ['2024-01-15', expectedDate],
    ['invalid', null],
  ])('should parse %s correctly', (input, expected) => {
    expect(parseStringToDate(input)).toEqual(expected);
  });
});

// Browser test example
import { customRender, setupUser } from '@/tests/utils';

test('should display vault name', async () => {
  const user = setupUser();
  const { getByText } = customRender(<VaultCard vault={mockVault} />);
  await expect.element(getByText('My Vault')).toBeVisible();
});
```

### Test Requirements

- **Run tests before claiming work is complete**: `pnpm test:ci`
- **E2E for critical paths**: Always add E2E tests for auth flows, CRUD operations
- **No mocking external APIs in E2E**: Use real API calls with test accounts
- **Use test utilities**: Import from `@/tests/utils`, use `customRender` not raw `render`

### Do NOT

- Skip tests for "simple" changes - bugs hide in simple code
- Mock internal modules in unit tests - test real implementations
- Write E2E tests for every component - use browser tests instead
- Leave failing tests - fix before committing

---

## Git Workflow

### Branch Naming

```
feature/TICKET-123-short-description
fix/TICKET-456-bug-description
refactor/TICKET-789-what-is-changing
```

### Commit Messages

Follow conventional commits format:

```
feat(vaults): add vault creation form

- Added VaultForm component with validation
- Integrated with oRPC createVault mutation

Closes #123
```

**Prefixes:**
| Prefix | Use For |
|--------|---------|
| `feat` | New features |
| `fix` | Bug fixes |
| `refactor` | Code restructuring without behavior change |
| `chore` | Build, config, deps updates |
| `docs` | Documentation only |
| `test` | Test additions/fixes |

### Before Committing

1. Run `pnpm lint` - must pass
2. Run `pnpm test:ci` - must pass
3. Run `pnpm build` - must succeed
4. Review your own changes for defects

### Pull Request Requirements

- Clear description of changes
- Link to related tickets/issues
- All CI checks passing
- Self-reviewed for code quality

---

## Code Organization

### Directory Structure

```
src/
├── components/       # Shared, reusable UI components
├── features/         # Feature modules (domain-driven)
│   └── [feature]/
│       ├── components/   # Feature-specific components
│       ├── data/         # Queries, mutations
│       ├── page-*.tsx    # Page components
│       └── schema.ts     # Zod schemas
├── server/           # Backend code (oRPC routers, repositories)
├── lib/              # Utility libraries
├── hooks/            # Shared custom hooks
└── routes/           # File-based routing (TanStack Router)
```

### File Naming

- **Components**: `kebab-case.tsx` (enforced by ESLint)
- **Utilities**: `kebab-case.ts`
- **Tests**: `*.unit.spec.ts` or `*.browser.spec.ts`
- **Schemas**: `schema.ts` within feature directory

### Component Organization

```typescript
// Component file structure
import { external dependencies }
import { internal dependencies by path alias }
import { relative imports }
import type { Type } from '@/types'

type Props = { ... }

export function ComponentName({ prop1, prop2 }: Props) {
  // hooks
  // derived state
  // handlers
  // render
}
```

### Where Code Belongs

| Code Type | Location |
|-----------|----------|
| Shared UI components | `src/components/ui/` |
| Feature-specific components | `src/features/[feature]/components/` |
| API routers | `src/server/routers/` |
| External API clients | `src/server/vault-api/` |
| Reusable hooks | `src/hooks/` |
| Feature-specific hooks | `src/features/[feature]/` |
| Zod schemas | `src/features/[feature]/schema.ts` |
| Global types | `src/types/` |

---

## API Patterns

### oRPC Router Structure

```typescript
// src/server/routers/[resource].ts
import { protectedProcedure } from '../orpc';
import { z } from 'zod';

const tags = ['Resource'];

export const resourceRouter = {
  list: protectedProcedure()
    .route({ method: 'GET', path: '/resources', tags })
    .input(zResourceListParams)
    .output(zResourceListResponse)
    .handler(async ({ input, context }) => {
      // implementation
    }),
};
```

### Error Handling

Use domain-specific error classes in `src/server/vault-api/errors.ts`:

```typescript
// Throw specific errors
throw new VaultNotFoundError(vaultId);
throw new VaultApiUnauthorizedError();
throw new VaultApiForbiddenError();
```

Map HTTP status codes consistently:

| Status | Error Class | Meaning |
|--------|-------------|---------|
| 401 | `VaultApiUnauthorizedError` | Authentication required |
| 403 | `VaultApiForbiddenError` | Permission denied |
| 400 | `VaultApiBadRequestError` | Invalid input |
| 404 | `VaultNotFoundError` | Resource not found |
| 500+ | `VaultApiError` | Server error |

### Validation with Zod

- Define schemas in feature's `schema.ts`
- Use `.input()` and `.output()` on oRPC procedures
- Export individual schemas and composed types

```typescript
// src/features/vaults/schema.ts
export const zVault = z.object({
  id: z.string(),
  name: z.string(),
  // ...
});

export type Vault = z.infer<typeof zVault>;
```

### Client-Side Data Fetching

Use oRPC React Query integration:

```typescript
import { orpc } from '@/lib/orpc/client';

// In component
const { data, isLoading } = orpc.vaults.list.useQuery({
  input: { page: 1, limit: 10 },
});
```

---

## Code Review Requirements

**Claude must review all implementations for defects before considering work complete.**

### Self-Review Checklist

Before claiming any task is done, verify:

- [ ] **Logic correctness**: Does the code do what it's supposed to?
- [ ] **Edge cases**: Are null/undefined/empty states handled?
- [ ] **Error handling**: Are errors caught and handled appropriately?
- [ ] **Type safety**: No `any` types, proper null checks
- [ ] **Security**: No XSS, injection, or data exposure risks
- [ ] **Performance**: No unnecessary re-renders, N+1 queries, or memory leaks
- [ ] **DRY**: No duplicated code that should be extracted
- [ ] **Naming**: Clear, descriptive names for variables and functions
- [ ] **Tests**: Required tests written and passing

### Code Quality Standards

- **No unused code**: Remove dead code, unused imports, commented-out code
- **No console.log**: Remove debugging statements
- **Consistent patterns**: Follow existing codebase conventions
- **Small functions**: Break down functions > 50 lines
- **Single responsibility**: Each function/component does one thing

### After Implementation

1. Run `pnpm lint` and fix all issues
2. Run `pnpm test:ci` and ensure all tests pass
3. Run `pnpm build` to verify build succeeds
4. Review diff for any mistakes or improvements
5. Only then report task as complete
