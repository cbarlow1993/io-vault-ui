# Clean Architecture Assessment: Value Objects & Domain Models

## Executive Summary

This codebase follows a **feature-based organization** but lacks core clean architecture principles, particularly around **value objects** and **domain models**. The architecture is closer to a **layered architecture with anemic domain models** rather than true clean architecture.

**Overall Grade: C+**

The codebase is well-organized for a feature-based structure, but business logic is mixed with infrastructure concerns, and domain concepts are represented as primitive types rather than rich domain models.

---

## Current Architecture Analysis

### ✅ Strengths

1. **Feature-based organization**: Clear separation by feature (`auth`, `book`, `user`, etc.)
2. **Type safety**: Strong TypeScript usage with Zod validation
3. **Validation layer**: Zod schemas provide input validation
4. **Permission system**: Well-structured RBAC implementation
5. **Separation of concerns**: UI components are separated from API routes

### ❌ Critical Issues

#### 1. **No Value Objects**

**Current State:**
- Primitive types used everywhere (`string` for email, `string` for book title, etc.)
- Validation exists but is scattered in Zod schemas
- No encapsulation of domain concepts

**Examples:**
```typescript
// ❌ Current: Primitive string
email: z.string().email()

// ✅ Should be: Value Object with Zod integration
class Email {
  private constructor(private readonly value: string) {}
  static create(value: string): Email { ... }
  equals(other: Email): boolean { ... }
  toString(): string { return this.value; }
}

// ✅ Zod schema that transforms string to Email
const zEmail = () =>
  z.string()
    .email('Invalid email format')
    .transform((val) => Email.create(val.trim().toLowerCase()));

// ✅ Usage - works with React Hook Form!
const schema = z.object({
  email: zEmail(), // Returns Email value object
});

type FormData = z.infer<typeof schema>;
// FormData = { email: Email } ✅
```

**Note:** Value objects work perfectly with Zod using `.transform()`. See `VALUE_OBJECTS_WITH_ZOD.md` for complete examples.

**Impact:**
- Business rules can be violated (e.g., empty strings, invalid formats)
- No type safety for domain concepts
- Validation logic scattered across layers
- Difficult to enforce invariants

#### 2. **Anemic Domain Models**

**Current State:**
- Prisma models are data containers only
- Zod schemas define structure but no behavior
- Business logic lives in routers/handlers

**Example from `src/server/routers/user.ts`:**
```typescript
// ❌ Business logic in infrastructure layer
if (context.user.id === input.id) {
  throw new ORPCError('BAD_REQUEST', {
    message: 'You cannot delete yourself',
  });
}
```

**Should be:**
```typescript
// ✅ Business logic in domain
class User {
  canDelete(deletingUserId: UserId): boolean {
    return !this.id.equals(deletingUserId);
  }
}
```

**Impact:**
- Business rules scattered across codebase
- Difficult to test business logic in isolation
- Changes to business rules require touching multiple layers
- No single source of truth for domain rules

#### 3. **No Domain Layer**

**Missing Components:**
- ❌ Domain entities with behavior
- ❌ Value objects
- ❌ Domain services
- ❌ Repository interfaces (domain contracts)
- ❌ Domain events

**Current Structure:**
```
src/
├── features/          # Presentation + DTOs
├── server/
│   ├── routers/      # Application layer (mixed with infrastructure)
│   └── db/           # Infrastructure (Prisma)
└── prisma/           # Data layer
```

**Should be:**
```
src/
├── domain/           # Domain layer (business logic)
│   ├── entities/
│   ├── value-objects/
│   ├── repositories/ # Interfaces only
│   └── services/
├── application/      # Use cases
├── infrastructure/   # Prisma, external services
└── presentation/     # UI, API routes
```

#### 4. **Infrastructure Leakage**

**Issues:**
- Prisma types used directly in business logic
- Database concerns (Prisma errors) handled in application layer
- No abstraction over data access

**Example from `src/server/routers/book.ts`:**
```typescript
// ❌ Infrastructure concerns in application layer
try {
  return await context.db.book.create({ ... });
} catch (error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ORPCError('CONFLICT', { ... });
  }
}
```

#### 5. **No Use Cases / Application Services**

**Current State:**
- Routers directly call Prisma
- Business logic mixed with HTTP concerns
- No clear application layer

**Should have:**
```typescript
// Application layer
class CreateBookUseCase {
  constructor(private bookRepo: IBookRepository) {}
  
  async execute(command: CreateBookCommand): Promise<Book> {
    const book = Book.create(...);
    await this.bookRepo.save(book);
    return book;
  }
}
```

---

## Detailed Findings

### Value Objects Assessment

#### Missing Value Objects:

1. **Email** (`src/features/user/schema.ts`)
   - Currently: `z.string().email()`
   - Should be: `Email` value object with validation, normalization

2. **BookTitle** (`src/features/book/schema.ts`)
   - Currently: `z.string()`
   - Should be: `BookTitle` with max length, trim, validation rules

3. **Author** (`src/features/book/schema.ts`)
   - Currently: `z.string()`
   - Should be: `Author` value object

4. **UserId** (used throughout)
   - Currently: `z.string()`
   - Should be: `UserId` value object for type safety

5. **GenreId** (`src/features/genre/schema.ts`)
   - Currently: `z.string()`
   - Should be: `GenreId` value object

6. **Color** (`src/features/genre/schema.ts`)
   - Currently: `z.string().length(7)`
   - Should be: `HexColor` value object with validation

#### Example Implementation Needed:

```typescript
// src/domain/value-objects/email.ts
export class Email {
  private constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new InvalidEmailError(value);
    }
  }

  static create(value: string): Result<Email> {
    try {
      return Result.ok(new Email(value.toLowerCase().trim()));
    } catch (error) {
      return Result.fail(error);
    }
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
}
```

### Domain Models Assessment

#### Current Models (Anemic):

1. **User** (`prisma/schema.prisma` + `src/features/user/schema.ts`)
   - ❌ No behavior
   - ❌ No business rules
   - ❌ Just data structure

2. **Book** (`prisma/schema.prisma` + `src/features/book/schema.ts`)
   - ❌ No behavior
   - ❌ No invariants enforced
   - ❌ Business rules in routers

3. **Genre** (`prisma/schema.prisma` + `src/features/genre/schema.ts`)
   - ❌ No behavior
   - ❌ Just data

#### Example Domain Entity Needed:

```typescript
// src/domain/entities/book.ts
export class Book {
  private constructor(
    private readonly id: BookId,
    private title: BookTitle,
    private author: Author,
    private genreId: GenreId | null,
    private publisher: Publisher | null,
    private readonly createdAt: Date,
    private updatedAt: Date
  ) {}

  static create(
    title: string,
    author: string,
    genreId: string | null,
    publisher: string | null
  ): Result<Book> {
    const titleVO = BookTitle.create(title);
    const authorVO = Author.create(author);
    // ... validation
    
    return Result.ok(new Book(
      BookId.generate(),
      titleVO,
      authorVO,
      genreId ? GenreId.create(genreId) : null,
      publisher ? Publisher.create(publisher) : null,
      new Date(),
      new Date()
    ));
  }

  updateTitle(newTitle: string): Result<void> {
    const title = BookTitle.create(newTitle);
    if (title.isFailure) return title;
    
    this.title = title.value;
    this.updatedAt = new Date();
    return Result.ok();
  }

  canBeDeletedBy(user: User): boolean {
    // Business rule: only admins can delete
    return user.role === 'admin';
  }
}
```

---

## Clean Architecture Violations

### Dependency Rule Violations

**Current Flow:**
```
Routers → Prisma (Infrastructure)
  ↓
Features → Prisma Types
```

**Should be:**
```
Routers → Use Cases → Domain
  ↓
Infrastructure → Domain (via interfaces)
```

### Business Logic Location

**Violations Found:**

1. **`src/server/routers/user.ts:236`**
   ```typescript
   // ❌ Business rule in infrastructure layer
   if (context.user.id === input.id) {
     throw new ORPCError('BAD_REQUEST', {
       message: 'You cannot delete yourself',
     });
   }
   ```

2. **`src/server/routers/user.ts:153`**
   ```typescript
   // ❌ Business rule in infrastructure layer
   role: context.user.id === input.id ? undefined : input.role,
   ```

3. **`src/server/routers/user.ts:157`**
   ```typescript
   // ❌ Business rule in infrastructure layer
   emailVerified: currentUser.email !== input.email ? true : undefined,
   ```

### Primitive Obsession

Throughout the codebase, primitive types are used instead of value objects:
- `string` for IDs, emails, titles
- `Date` for timestamps (could be `CreatedAt`, `UpdatedAt` value objects)
- No type safety for domain concepts

---

## Recommendations

### Priority 1: Critical (Do First)

1. **Introduce Value Objects**
   - Start with `Email`, `UserId`, `BookId`
   - Create base `ValueObject` class
   - Implement for all domain concepts

2. **Create Domain Layer**
   - Add `src/domain/` directory
   - Move business logic from routers to domain entities
   - Create repository interfaces

3. **Extract Use Cases**
   - Create application layer with use cases
   - Move router handlers to use case calls
   - Separate HTTP concerns from business logic

### Priority 2: Important (Do Soon)

4. **Implement Repository Pattern**
   - Create repository interfaces in domain
   - Implement repositories in infrastructure
   - Replace direct Prisma calls

5. **Add Domain Services**
   - For complex business logic that doesn't fit in entities
   - Example: `UserDeletionService`, `BookValidationService`

6. **Introduce Domain Events**
   - For side effects and integration
   - Example: `UserCreatedEvent`, `BookDeletedEvent`

### Priority 3: Nice to Have

7. **Add Result/Either Types**
   - For better error handling
   - Replace exceptions with Result types

8. **Add Domain Specifications**
   - For complex queries
   - Example: `ActiveUserSpecification`, `PublishedBookSpecification`

9. **Implement Aggregate Roots**
   - Identify aggregates (User, Book)
   - Enforce consistency boundaries

---

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
1. Create `src/domain/` structure
2. Implement base value object class
3. Create first value objects (`Email`, `UserId`)

### Phase 2: Domain Entities (Week 3-4)
1. Convert `User` to domain entity
2. Convert `Book` to domain entity
3. Move business logic from routers

### Phase 3: Application Layer (Week 5-6)
1. Create use cases
2. Refactor routers to call use cases
3. Add repository interfaces

### Phase 4: Infrastructure (Week 7-8)
1. Implement repositories
2. Remove direct Prisma calls
3. Add domain events

---

## Code Examples

### Before (Current)

```typescript
// src/server/routers/book.ts
.handler(async ({ context, input }) => {
  return await context.db.book.create({
    data: {
      title: input.title,
      author: input.author,
      genreId: input.genreId ?? undefined,
      publisher: input.publisher,
    },
  });
})
```

### After (Clean Architecture)

```typescript
// src/domain/entities/book.ts
export class Book {
  static create(
    title: string,
    author: string,
    genreId: string | null,
    publisher: string | null
  ): Result<Book> {
    // Validation and business rules here
  }
}

// src/application/use-cases/create-book.ts
export class CreateBookUseCase {
  constructor(private bookRepo: IBookRepository) {}
  
  async execute(command: CreateBookCommand): Promise<Result<Book>> {
    const book = Book.create(
      command.title,
      command.author,
      command.genreId,
      command.publisher
    );
    
    if (book.isFailure) return book;
    
    await this.bookRepo.save(book.value);
    return book;
  }
}

// src/server/routers/book.ts
.handler(async ({ context, input }) => {
  const useCase = new CreateBookUseCase(context.bookRepo);
  const result = await useCase.execute(input);
  
  if (result.isFailure) {
    throw mapToORPCError(result.error);
  }
  
  return result.value;
})
```

---

## Conclusion

The codebase has a **solid foundation** with good TypeScript practices and feature organization, but it **lacks the core principles of clean architecture**:

- ❌ No value objects (primitive obsession)
- ❌ Anemic domain models (no behavior)
- ❌ Business logic in wrong layers
- ❌ No clear domain layer
- ❌ Infrastructure leakage

**Recommendation:** Start with value objects and domain entities for the most critical domain concepts (`User`, `Book`), then gradually refactor the rest of the codebase.

---

## References

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Value Objects in TypeScript](https://khalilstemmler.com/articles/typescript-value-object/)
