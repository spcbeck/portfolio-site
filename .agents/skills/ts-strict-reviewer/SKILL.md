---
name: ts-strict-reviewer
description: Use when reviewing, writing, or refactoring TypeScript code to enforce strict type safety, eliminate any/unknown leaks, and ensure robust runtime-to-type boundaries.
---

# TypeScript Strict Reviewer

## Overview
Enforce uncompromising type safety and defensive type architecture across frontend and backend codebases. This skill eliminates silent runtime type errors, unsafe type assertions, and incomplete state representations.

---

## 1. Compiler Baseline: Strict Flags
Every production TypeScript project must configure strict options in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

---

## 2. The Iron Laws of Type Safety

### Law 1: Never Use `any`
* `any` disables the compiler and cascades unchecked assumptions throughout your code.
* Use `unknown` for values whose structure is unknown at compile time.
* Narrow `unknown` using custom type guards (`val is Type`) or schema parsing before accessing properties.

### Law 2: No Blind Type Assertions (`as T`)
* ❌ `const user = response.data as User;` (Unsafe assumption: network payload might not match type).
* ✅ Parse and validate payloads at runtime using a validation library (Zod, Valibot, ArkType).

```typescript
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1),
  role: z.enum(['admin', 'member', 'guest']),
  createdAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

export async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  const data: unknown = await res.json();
  
  // Safe runtime validation + static typing guarantee
  return UserSchema.parse(data);
}
```

### Law 3: Model Invariants with Discriminated Unions
Never use parallel optional fields to represent mutually exclusive lifecycle states:

```typescript
// ❌ BAD: Can exist in impossible states (e.g. isLoading: true, error: Error, data: User)
interface BadState {
  isLoading: boolean;
  error?: Error;
  data?: User;
}

// ✅ GOOD: Impossible states cannot be represented
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

export function renderUserStatus(state: AsyncState<User>): string {
  switch (state.status) {
    case 'idle':
      return 'Ready';
    case 'loading':
      return 'Loading user data...';
    case 'success':
      return `Welcome, ${state.data.displayName}`;
    case 'error':
      return `Failed to load: ${state.error.message}`;
    default: {
      // Compile-time exhaustiveness guarantee
      const _exhaustiveCheck: never = state;
      return _exhaustiveCheck;
    }
  }
}
```

---

## 3. Advanced Type Narrowing & Predicates

### Type Predicates
When checking polymorphic data, write deterministic type guards:

```typescript
interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiError {
  success: false;
  error: { code: string; message: string };
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function isApiError<T>(response: ApiResponse<T>): response is ApiError {
  return response.success === false;
}
```

### Safe Index Access (`noUncheckedIndexedAccess`)
When querying arrays or records, remember that indexing can return `undefined`:

```typescript
// With noUncheckedIndexedAccess:
const list: string[] = ['alpha', 'beta'];
const item = list[0]; // item is typed as string | undefined

// Guard or default explicitly:
if (item !== undefined) {
  console.log(item.toUpperCase());
}
```

---

## 4. Immutability Patterns
* Use `as const` on static objects to infer literal types instead of generic primitives.
* Prefer `readonly` modifiers on interfaces and `ReadonlyArray<T>` to guarantee functions do not mutate external state:

```typescript
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
} as const;

export type HttpStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];

export interface Configuration {
  readonly endpoint: string;
  readonly timeoutMs: number;
  readonly retryAttempts: number;
}
```

---

## 5. Review Checklist for Pull Requests / Code Reviews
- [ ] No `any` keywords anywhere in the changeset.
- [ ] No double type assertions (e.g. `foo as unknown as Bar`).
- [ ] Non-null assertions (`!`) avoided or justified with invariant assertions.
- [ ] All external I/O (APIs, query parameters, local storage, form inputs) validated with runtime schemas.
- [ ] Discriminated unions used for multi-state operations instead of boolean combinations.
- [ ] Switch statements on unions include `default: const _exhaustive: never = ...`.
- [ ] Generic constraints used (`<T extends Record<string, unknown>>` vs `<T>`).
