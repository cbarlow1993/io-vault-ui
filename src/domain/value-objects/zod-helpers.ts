/**
 * Zod Helpers for Value Objects
 *
 * Utility functions to create Zod schemas that work with value objects
 * while maintaining compatibility with React Hook Form.
 */

import { z } from 'zod';

/**
 * Base interface for value objects that can be serialized
 */
export interface Serializable {
  toString(): string;
  toJSON(): string | number | boolean;
}

/**
 * Creates a Zod schema that transforms a string to a value object
 *
 * @param createFn - Function that creates the value object from a string
 * @param validationFn - Optional validation function (returns error message or null)
 *
 * @example
 * ```typescript
 * const zEmail = createValueObjectSchema(
 *   (val) => Email.create(val),
 *   (val) => {
 *     if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
 *       return 'Invalid email format';
 *     }
 *     return null;
 *   }
 * );
 * ```
 */
export function createValueObjectSchema<T extends Serializable>(
  createFn: (value: string) => T,
  validationFn?: (value: string) => string | null
) {
  let schema = z.string();

  if (validationFn) {
    schema = schema.refine(
      (val) => {
        const error = validationFn(val);
        return error === null;
      },
      (val) => {
        const error = validationFn(val);
        return { message: error ?? 'Validation failed' };
      }
    ) as z.ZodString;
  }

  return schema.transform((val) => createFn(val.trim()));
}

/**
 * Creates a Zod schema for value objects that can be converted back to string
 * Useful for forms where you need to display the value
 *
 * @param createFn - Function that creates the value object
 * @param toStringFn - Function that converts value object back to string
 */
export function createBidirectionalValueObjectSchema<T extends Serializable>(
  createFn: (value: string) => T,
  toStringFn: (vo: T) => string = (vo) => vo.toString()
) {
  return z
    .union([
      z.string().transform((val) => createFn(val)),
      z.instanceof(Object as new () => T).transform((vo) => vo),
    ])
    .transform((val) => {
      if (typeof val === 'string') {
        return createFn(val);
      }
      return val;
    });
}

/**
 * Helper to create optional value object schemas
 */
export function optionalValueObject<T extends Serializable>(
  schema: z.ZodType<T>
): z.ZodOptional<z.ZodType<T>> {
  return schema.optional();
}

/**
 * Helper to create nullable value object schemas
 */
export function nullableValueObject<T extends Serializable>(
  schema: z.ZodType<T>
): z.ZodNullable<z.ZodType<T>> {
  return schema.nullable();
}

/**
 * Helper to create nullish value object schemas
 */
export function nullishValueObject<T extends Serializable>(
  schema: z.ZodType<T>
): z.ZodNullish<z.ZodType<T>> {
  return schema.nullish();
}

/**
 * Type helper to extract the value object type from a Zod schema
 */
export type ValueObjectFromZod<T> = T extends z.ZodType<infer U> ? U : never;
