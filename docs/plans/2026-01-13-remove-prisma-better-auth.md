# Remove Prisma and better-auth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove Prisma ORM and better-auth from the application, consolidating on Clerk for all authentication and user management.

**Architecture:** The application currently has a pluggable auth system supporting both Clerk (SaaS) and better-auth (self-hosted). We're removing the better-auth option and its dependencies (including Drizzle ORM used by better-auth, and Prisma used for Chargebee billing data). Chargebee webhook handlers will be commented out for later work since they depend on database storage.

**Tech Stack:** Clerk (auth), TanStack Start (routing), oRPC (API)

---

## Task 1: Remove Prisma Dependencies and Files

**Files:**
- Delete: `prisma/` directory (schema.prisma, migrations/, seed/)
- Delete: `src/server/db/index.ts`
- Delete: `src/server/db/generated/` directory
- Modify: `package.json` (remove prisma dependencies)

**Step 1: Delete Prisma schema and migrations**

```bash
rm -rf prisma/
```

**Step 2: Delete Prisma client and generated code**

```bash
rm -rf src/server/db/
```

**Step 3: Remove Prisma dependencies from package.json**

Remove these dependencies:
- `@prisma/client`
- `prisma` (devDependency)

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Prisma ORM files and dependencies"
```

---

## Task 2: Remove Drizzle ORM (Used by better-auth)

**Files:**
- Delete: `src/lib/db/schema.ts`
- Delete: `src/lib/db/` directory
- Modify: `package.json` (remove drizzle dependencies)

**Step 1: Delete Drizzle schema and db directory**

```bash
rm -rf src/lib/db/
```

**Step 2: Remove Drizzle dependencies from package.json**

Remove these dependencies:
- `drizzle-orm`
- `drizzle-kit` (devDependency)
- `@libsql/client` (if present)
- Any postgres/pg drivers used by drizzle

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove Drizzle ORM files and dependencies"
```

---

## Task 3: Remove better-auth Files

**Files:**
- Delete: `src/lib/auth/better-auth-instance.ts`
- Delete: `src/lib/auth/better-auth-provider.ts`
- Delete: `src/lib/auth/better-auth-client.ts`

**Step 1: Delete better-auth implementation files**

```bash
rm src/lib/auth/better-auth-instance.ts
rm src/lib/auth/better-auth-provider.ts
rm src/lib/auth/better-auth-client.ts
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove better-auth implementation files"
```

---

## Task 4: Remove better-auth Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Remove better-auth dependencies from package.json**

Remove these dependencies:
- `better-auth`
- `@better-auth/expo`

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove better-auth dependencies"
```

---

## Task 5: Simplify Auth Abstraction Layer

**Files:**
- Modify: `src/lib/auth/index.ts`
- Modify: `src/lib/auth/types.ts`
- Delete: `src/server/auth.ts` (if only exporting better-auth)

**Step 1: Update `src/lib/auth/types.ts`**

Remove AUTH_MODE references, keep just the unified types needed by Clerk provider:

```typescript
export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  role: string;
  organizationRole: string | null;
};

export type Organization = {
  id: string;
  name: string;
  slug: string | null;
  metadata: Record<string, unknown>;
};

export type Session = {
  user: AuthUser;
  organization: Organization | null;
};

// Keep AuthProvider interface but it's now just Clerk
export interface AuthProvider {
  // Server-side methods
  getSession: () => Promise<Session | null>;
  getUser: (userId: string) => Promise<AuthUser | null>;
  updateUser: (userId: string, data: { name?: string }) => Promise<AuthUser>;
  deleteUser: (userId: string) => Promise<void>;
  getOrganization: (orgId: string) => Promise<Organization | null>;
  getUserOrganizations: (userId: string) => Promise<Organization[]>;

  // Client-side methods
  useSession: () => {
    data: Session | null;
    isPending: boolean;
    error: Error | null;
  };
  signIn: () => Promise<never>;
  signUp: () => Promise<never>;
  signOut: () => Promise<void>;
}
```

**Step 2: Update `src/lib/auth/index.ts`**

Simplify to only export Clerk provider:

```typescript
import { clerkAuthProvider } from './clerk-provider';

export const authProvider = clerkAuthProvider;
export const getAuthProvider = () => clerkAuthProvider;

// Remove mode helpers - we're always Clerk now
export const isClerkMode = () => true;

export type { AuthUser, Organization, Session, AuthProvider } from './types';
```

**Step 3: Update or delete `src/server/auth.ts`**

If this file only re-exports better-auth, delete it. Otherwise, update to only reference Clerk:

```typescript
import { authProvider } from '@/lib/auth';

export { authProvider };
export const getSession = () => authProvider.getSession();
```

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: simplify auth abstraction to Clerk-only"
```

---

## Task 6: Update Auth API Route

**Files:**
- Modify: `src/routes/api/auth.$.ts`

**Step 1: Update auth API route**

Since we're removing better-auth, this route should either be deleted or return a clear message:

```typescript
import { createAPIFileRoute } from '@tanstack/react-start/api';

export const APIRoute = createAPIFileRoute('/api/auth/$')({
  GET: () => {
    return new Response('Authentication is handled by Clerk', { status: 404 });
  },
  POST: () => {
    return new Response('Authentication is handled by Clerk', { status: 404 });
  },
});
```

**Step 2: Commit**

```bash
git add -A
git commit -m "refactor: update auth API route for Clerk-only mode"
```

---

## Task 7: Comment Out Chargebee Webhook Handlers

**Files:**
- Modify: `src/routes/api/webhooks/chargebee.ts`
- Modify: `src/server/webhooks/chargebee/handlers.ts`

**Step 1: Comment out webhook route handler**

In `src/routes/api/webhooks/chargebee.ts`, comment out the handler body and return a placeholder:

```typescript
import { createAPIFileRoute } from '@tanstack/react-start/api';

export const APIRoute = createAPIFileRoute('/api/webhooks/chargebee')({
  POST: async ({ request }) => {
    // TODO: Re-implement when database layer is added
    // Chargebee webhook handling is temporarily disabled
    // See: docs/plans/2026-01-13-remove-prisma-better-auth.md
    console.log('Chargebee webhook received but handler is disabled');

    return new Response(JSON.stringify({ received: true, processed: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  },
});
```

**Step 2: Comment out or delete webhook handlers file**

Either delete `src/server/webhooks/chargebee/handlers.ts` or comment out its contents with a TODO note.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: comment out Chargebee webhook handlers (needs DB layer)"
```

---

## Task 8: Update Server Environment Variables

**Files:**
- Modify: `src/env/server.ts`

**Step 1: Remove database and better-auth environment variables**

Remove these environment variable definitions:
- `DATABASE_URL`
- `AUTH_MODE`
- `AUTH_SECRET`
- `AUTH_SESSION_EXPIRATION_IN_SECONDS`
- `AUTH_SESSION_UPDATE_AGE_IN_SECONDS`
- `AUTH_TRUSTED_ORIGINS`
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` (if only used by better-auth)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (if only used by better-auth)

Keep Clerk and Chargebee environment variables.

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove database and better-auth env variables"
```

---

## Task 9: Update Billing Router (Remove DB References)

**Files:**
- Modify: `src/server/routers/billing.ts`

**Step 1: Update billing router**

Remove any imports from `src/server/db` and update methods that relied on cached database data to fetch directly from Chargebee API instead. If there are methods that can't work without DB caching, comment them out with TODO notes.

**Step 2: Commit**

```bash
git add -A
git commit -m "refactor: update billing router to work without database"
```

---

## Task 10: Fix Any Import Errors

**Files:**
- Various files that may import from deleted modules

**Step 1: Search for broken imports**

Search for imports from:
- `@/server/db`
- `@/lib/db`
- `better-auth`
- `drizzle`
- Any references to `AUTH_MODE`

**Step 2: Fix or remove broken imports**

Update each file to either:
- Remove the import if unused
- Replace with Clerk equivalent
- Comment out with TODO if needed for future work

**Step 3: Commit**

```bash
git add -A
git commit -m "fix: resolve broken imports after removing Prisma/better-auth"
```

---

## Task 11: Update oRPC Context (If Needed)

**Files:**
- Modify: `src/server/orpc.ts`

**Step 1: Review oRPC context**

Check if the oRPC context relies on better-auth or database access. Update to use Clerk-only auth:

```typescript
import { authProvider } from '@/lib/auth';

// In context creation
const session = await authProvider.getSession();
```

**Step 2: Commit**

```bash
git add -A
git commit -m "refactor: update oRPC context for Clerk-only auth"
```

---

## Task 12: Clean Up and Install Dependencies

**Step 1: Run pnpm install to update lockfile**

```bash
pnpm install
```

**Step 2: Verify the application starts**

```bash
pnpm dev
```

**Step 3: Fix any runtime errors**

Address any errors that appear during startup or navigation.

**Step 4: Commit final cleanup**

```bash
git add -A
git commit -m "chore: clean up dependencies and verify build"
```

---

## Task 13: Update .env.example

**Files:**
- Modify: `.env.example`

**Step 1: Remove deprecated environment variables**

Remove database and better-auth related variables from the example file.

**Step 2: Commit**

```bash
git add -A
git commit -m "docs: update .env.example after removing Prisma/better-auth"
```

---

## Summary of Files to Delete

```
prisma/                              # Entire directory
src/server/db/                       # Entire directory
src/lib/db/                          # Entire directory
src/lib/auth/better-auth-instance.ts
src/lib/auth/better-auth-provider.ts
src/lib/auth/better-auth-client.ts
src/server/webhooks/                 # Or comment out contents
```

## Summary of Files to Modify

```
package.json                         # Remove dependencies
src/lib/auth/index.ts               # Simplify to Clerk-only
src/lib/auth/types.ts               # Remove AUTH_MODE references
src/server/auth.ts                  # Update or delete
src/routes/api/auth.$.ts            # Update for Clerk-only
src/routes/api/webhooks/chargebee.ts # Comment out handler
src/env/server.ts                   # Remove DB/auth env vars
src/server/routers/billing.ts       # Remove DB references
src/server/orpc.ts                  # Update context if needed
.env.example                        # Remove deprecated vars
```

## Dependencies to Remove

```json
{
  "dependencies": {
    "@prisma/client": "remove",
    "better-auth": "remove",
    "@better-auth/expo": "remove",
    "drizzle-orm": "remove"
  },
  "devDependencies": {
    "prisma": "remove",
    "drizzle-kit": "remove"
  }
}
```
