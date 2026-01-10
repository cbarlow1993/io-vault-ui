/**
 * Example: Email Value Object with Zod Integration
 *
 * This demonstrates how to use value objects with Zod validation
 * while maintaining compatibility with React Hook Form.
 */

import { z } from 'zod';

// ============================================================================
// Approach 1: Value Object with Zod Transform (Recommended)
// ============================================================================

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

  // For serialization (JSON, database)
  toJSON(): string {
    return this.value;
  }
}

/**
 * Zod schema that transforms string to Email value object
 * Works seamlessly with React Hook Form
 */
export const zEmail = () =>
  z
    .string()
    .email('Invalid email format')
    .transform((val) => Email.create(val));

/**
 * Usage in forms:
 *
 * const schema = z.object({
 *   email: zEmail(),
 * });
 *
 * // Type inference: { email: Email }
 * type FormData = z.infer<typeof schema>;
 */

// ============================================================================
// Approach 2: Zod Custom with Refinement (More Control)
// ============================================================================

export const zEmailCustom = () =>
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

// ============================================================================
// Approach 3: Preprocess + Transform (For Complex Cases)
// ============================================================================

export const zEmailPreprocess = () =>
  z.preprocess(
    (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
    z
      .string()
      .email()
      .transform((val) => Email.create(val))
  );

// ============================================================================
// Approach 4: Branded Types (Simpler, Less Powerful)
// ============================================================================

/**
 * Branded types provide type safety without runtime overhead
 * Good for simple cases where you don't need full value objects
 */

export type EmailBrand = z.BRAND<'Email'>;
export const zEmailBranded = () =>
  z
    .string()
    .email()
    .transform((val) => val.toLowerCase().trim())
    .brand<'Email'>();

// Usage: type Email = z.infer<ReturnType<typeof zEmailBranded>>;
// This gives you type safety but Email is still a string at runtime

// ============================================================================
// Approach 5: Two-Way Transformation (For Forms)
// ============================================================================

/**
 * For React Hook Form, you might need to convert back to string
 * for form inputs. This helper handles both directions.
 */

export const zEmailForm = () =>
  z
    .string()
    .email('Invalid email format')
    .transform((val) => Email.create(val))
    .or(z.instanceof(Email).transform((email) => email.toString()));

/**
 * Or use a union type for form values:
 */
export const zEmailFormUnion = () =>
  z.union([
    z
      .string()
      .email()
      .transform((val) => Email.create(val)),
    z.instanceof(Email),
  ]);

// ============================================================================
// Practical Example: Integration with Existing Schema
// ============================================================================

/**
 * Before (current):
 *
 * export const zUser = () =>
 *   z.object({
 *     email: z.string().email(),
 *   });
 */

/**
 * After (with value object):
 */
export const zUserWithEmail = () =>
  z.object({
    id: z.string(),
    email: zEmail(), // Returns Email value object
    name: z.string().optional(),
  });

/**
 * Type inference works correctly:
 * type User = z.infer<ReturnType<typeof zUserWithEmail>>;
 * // User = { id: string; email: Email; name?: string }
 */

// ============================================================================
// Handling Form Submission
// ============================================================================

/**
 * When submitting forms, you can work with Email objects directly:
 */
export const handleUserSubmit = (
  data: z.infer<ReturnType<typeof zUserWithEmail>>
) => {
  // data.email is an Email instance, not a string
  console.log(data.email.toString()); // "user@example.com"
  console.log(data.email.equals(Email.create('user@example.com'))); // true

  // Convert to DTO for API
  return {
    email: data.email.toString(), // Convert back to string for API
    name: data.name,
  };
};

// ============================================================================
// Error Handling Pattern
// ============================================================================

/**
 * For better error handling, you can use Result types:
 */

type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

export class SafeEmail {
  private constructor(private readonly value: string) {}

  static create(value: string): Result<SafeEmail, string> {
    const trimmed = value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return { success: false, error: 'Invalid email format' };
    }
    return { success: true, value: new SafeEmail(trimmed) };
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Zod schema with Result pattern:
 */
export const zEmailSafe = () =>
  z
    .string()
    .refine(
      (val) => {
        const result = SafeEmail.create(val);
        return result.success;
      },
      { message: 'Invalid email format' }
    )
    .transform((val) => {
      const result = SafeEmail.create(val);
      if (!result.success) throw new Error(result.error);
      return result.value;
    });
