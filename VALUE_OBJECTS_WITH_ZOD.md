# Value Objects with Zod: Integration Guide

## Yes, Value Objects Work with Zod! ✅

You can absolutely use value objects with Zod validation while maintaining full compatibility with React Hook Form. Here are several approaches, from simple to advanced.

---

## Quick Answer

**Yes, it's possible!** Use Zod's `.transform()` to convert strings to value objects:

```typescript
// ✅ Value Object
class Email {
  private constructor(private readonly value: string) {}
  static create(value: string): Email { ... }
  toString(): string { return this.value; }
}

// ✅ Zod Schema
const zEmail = () =>
  z.string()
    .email('Invalid email format')
    .transform((val) => Email.create(val.trim().toLowerCase()));

// ✅ Usage in forms (works with React Hook Form)
const schema = z.object({
  email: zEmail(),
});

type FormData = z.infer<typeof schema>;
// FormData = { email: Email } ✅
```

---

## Approaches

### 1. Transform Pattern (Recommended)

**Best for:** Most use cases, maintains type safety

```typescript
export class Email {
  private constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new Error(`Invalid email: ${value}`);
    }
  }

  static create(value: string): Email {
    return new Email(value.toLowerCase().trim());
  }

  private isValid(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  toString(): string {
    return this.value;
  }
}

export const zEmail = () =>
  z
    .string()
    .email('Invalid email format')
    .transform((val) => Email.create(val));
```

**Pros:**
- ✅ Full type safety
- ✅ Works with React Hook Form
- ✅ Clean API
- ✅ Type inference works correctly

**Cons:**
- ⚠️ Throws on invalid input (can be handled with try/catch in transform)

---

### 2. Refine + Transform (Safer)

**Best for:** When you want better error messages

```typescript
export const zEmailSafe = () =>
  z
    .string()
    .email('Invalid email format')
    .refine(
      (val) => {
        try {
          Email.create(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Invalid email format' }
    )
    .transform((val) => Email.create(val));
```

**Pros:**
- ✅ Better error handling
- ✅ Validation happens before transformation
- ✅ Clear error messages

---

### 3. Preprocess + Transform (For Complex Cases)

**Best for:** When you need to normalize input first

```typescript
export const zEmailPreprocess = () =>
  z.preprocess(
    (val) => {
      // Normalize input
      if (typeof val === 'string') {
        return val.trim().toLowerCase();
      }
      return val;
    },
    z.string().email().transform((val) => Email.create(val))
  );
```

**Pros:**
- ✅ Handles input normalization
- ✅ Good for cleaning user input

---

### 4. Branded Types (Simpler Alternative)

**Best for:** When you only need type safety, not runtime behavior

```typescript
export type EmailBrand = z.BRAND<'Email'>;

export const zEmailBranded = () =>
  z
    .string()
    .email()
    .transform((val) => val.toLowerCase().trim())
    .brand<'Email'>();

// Usage
type Email = z.infer<ReturnType<typeof zEmailBranded>>;
// Email is still a string at runtime, but TypeScript treats it as Email
```

**Pros:**
- ✅ Zero runtime overhead
- ✅ Type safety
- ✅ Simple

**Cons:**
- ❌ No runtime validation/behavior
- ❌ Can't add methods to the type

---

## Integration with Your Existing Code

### Before (Current)

```typescript
// src/features/user/schema.ts
export const zUser = () =>
  z.object({
    id: z.string(),
    email: z.string().email(), // ❌ Primitive
    name: z.string().optional(),
  });
```

### After (With Value Objects)

```typescript
// src/domain/value-objects/email.ts
export class Email {
  private constructor(private readonly value: string) {}
  static create(value: string): Email { ... }
  toString(): string { return this.value; }
}

// src/domain/value-objects/email.schema.ts
export const zEmail = () =>
  z.string().email().transform((val) => Email.create(val));

// src/features/user/schema.ts
import { zEmail } from '@/domain/value-objects/email.schema';

export const zUser = () =>
  z.object({
    id: z.string(),
    email: zEmail(), // ✅ Value Object
    name: z.string().optional(),
  });

// Type inference still works!
type User = z.infer<ReturnType<typeof zUser>>;
// User = { id: string; email: Email; name?: string }
```

---

## React Hook Form Compatibility

### ✅ Works Out of the Box

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  email: zEmail(),
});

const form = useForm({
  resolver: zodResolver(schema),
});

// Form values will have Email instances
form.handleSubmit((data) => {
  console.log(data.email.toString()); // ✅ Works!
  console.log(data.email instanceof Email); // ✅ true
});
```

### ⚠️ Form Input Display

For form inputs, you might need to convert back to string:

```typescript
<FieldText
  {...form.register('email', {
    setValueAs: (value) => {
      // If it's already an Email, convert to string
      if (value instanceof Email) {
        return value.toString();
      }
      return value;
    },
  })}
/>
```

Or use a helper:

```typescript
// Helper to get string value for form inputs
const getEmailValue = (email: Email | string | undefined): string => {
  if (email instanceof Email) return email.toString();
  return email ?? '';
};

<FieldText
  {...form.register('email')}
  defaultValue={getEmailValue(form.getValues('email'))}
/>
```

---

## Complete Example: Email Value Object

```typescript
// src/domain/value-objects/email.ts
export class Email {
  private constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new Error(`Invalid email: ${value}`);
    }
  }

  static create(value: string): Email {
    return new Email(value.toLowerCase().trim());
  }

  private isValid(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}

// src/domain/value-objects/email.schema.ts
import { z } from 'zod';
import { Email } from './email';

export const zEmail = () =>
  z
    .string()
    .email('Invalid email format')
    .transform((val) => Email.create(val));

// src/features/user/schema.ts
import { zEmail } from '@/domain/value-objects/email.schema';

export const zUser = () =>
  z.object({
    id: z.string(),
    email: zEmail(),
    name: z.string().optional(),
  });

// Usage in component
const form = useForm({
  resolver: zodResolver(zUser()),
});

form.handleSubmit((data) => {
  // data.email is an Email instance ✅
  console.log(data.email.toString());
  console.log(data.email.equals(Email.create('test@example.com')));
});
```

---

## Migration Strategy

### Step 1: Create Value Object + Schema

```typescript
// src/domain/value-objects/email.ts
export class Email { ... }

// src/domain/value-objects/email.schema.ts
export const zEmail = () => z.string().email().transform(...);
```

### Step 2: Update Existing Schemas

```typescript
// Before
email: z.string().email()

// After
email: zEmail()
```

### Step 3: Update Type Usage

```typescript
// Before
const email: string = user.email;

// After
const email: Email = user.email;
const emailString: string = user.email.toString();
```

### Step 4: Update API Layer

```typescript
// When sending to API, convert to string
const dto = {
  email: user.email.toString(), // Email → string
};

// When receiving from API, convert to Email
const user = {
  email: Email.create(dto.email), // string → Email
};
```

---

## Common Patterns

### Optional Value Objects

```typescript
const schema = z.object({
  email: zEmail().optional(), // Email | undefined
});
```

### Nullable Value Objects

```typescript
const schema = z.object({
  email: zEmail().nullable(), // Email | null
});
```

### Array of Value Objects

```typescript
const schema = z.object({
  emails: z.array(zEmail()), // Email[]
});
```

### Nested Value Objects

```typescript
const zAddress = () =>
  z.object({
    street: z.string(),
    city: z.string(),
    zipCode: zZipCode(), // Another value object
  });
```

---

## Testing

```typescript
import { zEmail } from '@/domain/value-objects/email.schema';

describe('zEmail', () => {
  it('should transform string to Email', () => {
    const result = zEmail().parse('test@example.com');
    expect(result).toBeInstanceOf(Email);
    expect(result.toString()).toBe('test@example.com');
  });

  it('should reject invalid email', () => {
    expect(() => zEmail().parse('invalid')).toThrow();
  });
});
```

---

## Summary

✅ **Yes, value objects work perfectly with Zod!**

- Use `.transform()` to convert strings to value objects
- Type inference works correctly
- Compatible with React Hook Form
- Maintains type safety throughout your application

The key is using Zod's transformation capabilities to bridge between the string input (from forms/API) and your value objects (domain layer).
