---
name: dry-components
description: Use when building React components, identifying code duplication, or deciding whether to extract shared logic
---

# DRY Components

## Overview

Principles for avoiding duplication in React components while maintaining clarity. Extract when you see patterns, not when you predict them.

## The Rule of Three

**Extract shared code when you see it used 3+ times.** Not before.

```
1 occurrence → Leave inline
2 occurrences → Note it, leave inline
3 occurrences → Extract
```

## What to Extract

### Repeated UI Patterns → Component

```tsx
// Before: Same card pattern repeated
<div className="border-card p-4">
  <h3>{title1}</h3>
  <p>{description1}</p>
</div>
<div className="border-card p-4">
  <h3>{title2}</h3>
  <p>{description2}</p>
</div>

// After: Extract component
function InfoCard({ title, description }: InfoCardProps) {
  return (
    <div className="border-card p-4">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

<InfoCard title={title1} description={description1} />
<InfoCard title={title2} description={description2} />
```

### Repeated Logic → Hook

```tsx
// Before: Same fetch + loading pattern
function PageA() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchA().then(setData).finally(() => setLoading(false));
  }, []);
}

// After: Use existing React Query patterns
function PageA() {
  const { data, isLoading } = orpc.resources.list.useQuery();
}
```

### Repeated Transformations → Utility

```tsx
// Before: Same date formatting
<span>{new Date(item.createdAt).toLocaleDateString()}</span>
<span>{new Date(item.updatedAt).toLocaleDateString()}</span>

// After: Extract utility
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

<span>{formatDate(item.createdAt)}</span>
<span>{formatDate(item.updatedAt)}</span>
```

## Where Extracted Code Lives

| Type | Location |
|------|----------|
| Shared UI component | `src/components/` |
| Feature-specific component | `src/features/[feature]/components/` |
| Shared hook | `src/hooks/` |
| Feature-specific hook | `src/features/[feature]/hooks/` |
| Utility function | `src/lib/[domain]/` |

## Component Composition

Prefer composition over configuration:

```tsx
// Bad: Too many props
<Card
  title="Settings"
  showHeader={true}
  headerAction={<Button>Save</Button>}
  footer={<Button>Cancel</Button>}
  variant="outlined"
/>

// Good: Composition
<Card>
  <Card.Header>
    <Card.Title>Settings</Card.Title>
    <Button>Save</Button>
  </Card.Header>
  <Card.Body>{children}</Card.Body>
  <Card.Footer>
    <Button>Cancel</Button>
  </Card.Footer>
</Card>
```

## When NOT to Extract

- **Different contexts** - Similar code serving different purposes
- **Evolving independently** - Code that will diverge over time
- **Premature abstraction** - Only 1-2 occurrences
- **Small inline code** - 2-3 lines that are clear in context

```tsx
// Don't extract - clear inline and context-specific
const isActive = status === 'active';
const canEdit = user.role === 'admin' && !isLocked;
```

## Identifying Duplication

Look for:

1. **Copy-paste code** - Literally the same lines
2. **Similar structures** - Same shape with different data
3. **Repeated patterns** - Same approach to similar problems

Ask:

- Is this the same logic or just similar syntax?
- Would a change in one require change in others?
- Is the abstraction clearer than the duplication?

## Quick Reference

| Duplication | Solution | Location |
|-------------|----------|----------|
| UI pattern | Component | `components/` |
| Data fetching | React Query hook | Already solved |
| State + effects | Custom hook | `hooks/` |
| Data transformation | Utility function | `lib/` |
| Styling pattern | CSS class | `styles/app.css` |

## Common Mistakes

1. **Premature extraction** - Wait for 3+ occurrences
2. **Wrong abstraction level** - Too generic or too specific
3. **Prop explosion** - Too many configuration props
4. **Ignoring existing utilities** - Check before creating
5. **Extracting for prediction** - Extract what exists, not what might exist
