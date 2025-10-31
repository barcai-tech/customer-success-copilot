# Refactoring Implementation Guide

This guide provides step-by-step instructions for implementing the recommended refactorings from `CODE_QUALITY_ANALYSIS.md`.

---

## Phase 1: High-Impact, Low-Effort Refactorings

### 1. Extract Backend Client Utility

**Objective:** Centralize HMAC signing and backend tool invocation logic.

**Current State:** HMAC signing duplicated across 3 files  
**Effort:** ~1 hour  
**Impact:** Type safety, DRY, single audit point for security

#### Steps:

**Step 1: Create `frontend/src/llm/backend-client.ts`**

This new module will:

- Centralize HMAC signing logic
- Handle fetch with retry logic
- Validate responses with Zod schemas
- Provide type-safe interface

**Step 2: Update `frontend/src/agent/invokeTool.ts`**

Replace inline fetch with call to new backend-client.

**Step 3: Update `frontend/src/llm/provider.ts`**

Replace inline fetch with call to new backend-client.

**Step 4: Update `frontend/app/api/eval/stream/route.ts`**

Replace inline fetch with call to new backend-client (for streaming).

**Step 5: Tests**

- Verify HMAC signature matches original logic
- Test error handling paths
- Confirm streaming still works

---

### 2. Move ClerkUserSchema to Contracts

**Objective:** Create single source of truth for user validation schema.

**Current State:** Defined inline in `frontend/app/eval/actions.ts`  
**Effort:** ~15 minutes  
**Impact:** Discoverability, maintainability

#### Steps:

**Step 1: Create `frontend/src/contracts/user.ts`**

```typescript
import { z } from "zod";

export const ClerkUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
});

export type ClerkUser = z.infer<typeof ClerkUserSchema>;
```

**Step 2: Update `frontend/app/eval/actions.ts`**

Replace inline definition with import:

```typescript
import { ClerkUserSchema, type ClerkUser } from "@/src/contracts/user";
```

Remove the inline schema definition.

---

### 3. Remove Health API Endpoint

**Objective:** Eliminate unnecessary API route; use Server Action instead.

**Current State:** `frontend/app/api/db/health/route.ts` calls `checkDatabaseHealth()`  
**Effort:** ~30 minutes  
**Impact:** Smaller API surface, type-safe, one fewer route

#### Steps:

**Step 1: Update `frontend/app/dashboard/actions.ts`**

Already has `checkDatabaseHealth()`. No changes needed.

**Step 2: Find usages of `/api/db/health`**

Search codebase:

```bash
grep -r "api/db/health" frontend/
```

Likely location: dashboard component.

**Step 3: Update Component to Call Server Action**

Replace:

```typescript
// ❌ OLD
const response = await fetch("/api/db/health");
const result = await response.json();
```

With:

```typescript
// ✅ NEW
import { checkDatabaseHealth } from "@/app/dashboard/actions";
const result = await checkDatabaseHealth();
```

**Step 4: Delete Files**

- Remove `frontend/app/api/db/health/route.ts`
- Remove `frontend/app/api/db/` directory if empty

---

## Phase 2: Medium-Impact, Medium-Effort Refactorings

### 4. Split validation.ts into Modules

**Objective:** Improve organization and maintainability of validation logic.

**Current State:** `frontend/src/lib/validation.ts` is 400+ lines  
**Effort:** ~2 hours  
**Impact:** Discoverability, testability, maintainability

#### New Structure:

```
frontend/src/lib/validation/
├── index.ts                 (barrel export, backward compatibility)
├── schemas.ts              (all Zod schemas)
├── sanitizers.ts           (text/input sanitization functions)
├── xss.ts                  (XSS detection & prevention)
└── types.ts                (exported types)
```

#### Steps:

**Step 1: Create `frontend/src/lib/validation/` directory**

**Step 2: Create `frontend/src/lib/validation/xss.ts`**

```typescript
// All XSS-related logic from current validation.ts
export const hasXSSPatterns = (val: string): boolean => { ... };
export const hasCSPViolation = (val: string): boolean => { ... };
export const detectCSPViolation = (input: string): boolean => { ... };
```

**Step 3: Create `frontend/src/lib/validation/sanitizers.ts`**

```typescript
// All sanitization functions
export const sanitizeString = (val: string) => { ... };
export function sanitizeText(input: string, maxLength = 500) { ... };
export function sanitizeExternalId(input: string) { ... };
// ... rest of sanitization functions
```

**Step 4: Create `frontend/src/lib/validation/schemas.ts`**

```typescript
// All Zod schemas
export const textSchema = (maxLength = 500) => { ... };
export const externalIdSchema = z.string()... { ... };
export const companyNameSchema = z.string()... { ... };
// ... all schemas
```

**Step 5: Create `frontend/src/lib/validation/types.ts`**

```typescript
// Exported types
export type PlannerFormData = z.infer<typeof plannerFormSchema>;
export type EvalFormData = z.infer<typeof evalFormSchema>;
// ... all types
```

**Step 6: Create `frontend/src/lib/validation/index.ts` (Barrel Export)**

```typescript
// For backward compatibility and clean exports
export * from "./schemas";
export * from "./sanitizers";
export * from "./xss";
export * from "./types";
```

**Step 7: Update All Imports**

```bash
# Search and replace throughout codebase
# OLD: import { sanitizeText, companyNameSchema } from "@/src/lib/validation"
# NEW: import { sanitizeText, companyNameSchema } from "@/src/lib/validation"
# (no change needed because barrel export maintains compatibility)
```

---

### 5. Add Error Boundary Components

**Objective:** Graceful error handling for streaming sections and eval dashboard.

**Current State:** No error boundaries; crashes cascade  
**Effort:** ~1.5 hours  
**Impact:** Better UX, easier debugging, graceful degradation

#### Steps:

**Step 1: Create `frontend/src/components/ErrorBoundary.tsx`**

```typescript
"use client";

import { Component, ReactNode, ErrorInfo } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/src/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="text-xl font-bold">Something went wrong</h2>
              <p className="text-muted-foreground text-sm max-w-md">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
              <Button onClick={this.resetError}>Try again</Button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

**Step 2: Wrap CopilotDashboard**

In `frontend/app/page.tsx`:

```typescript
import { ErrorBoundary } from "@/src/components/ErrorBoundary";

export default function Home() {
  return (
    <div className="h-full w-full overflow-hidden">
      <Suspense fallback={<div>Loading...</div>}>
        <ErrorBoundary>
          <CopilotDashboard actions={{...}} />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}
```

**Step 3: Wrap EvalDashboard**

In `frontend/app/eval/page.tsx`:

```typescript
import { ErrorBoundary } from "@/src/components/ErrorBoundary";

export default async function EvalPage() {
  // ...
  return (
    <ErrorBoundary>
      <EvalDashboard actions={{...}} />
    </ErrorBoundary>
  );
}
```

---

### 6. Create Store Factory Utility

**Objective:** Eliminate duplication in Zustand store initialization.

**Current State:** Each store manually wraps with `devtools` middleware  
**Effort:** ~30 minutes  
**Impact:** DRY, consistency, easier to manage store configuration globally

#### Steps:

**Step 1: Create `frontend/src/store/utils.ts`**

```typescript
import { create, StateCreator } from "zustand";
import { devtools } from "zustand/middleware";

export const createStore = <T>(name: string, createState: StateCreator<T>) =>
  create<T>(devtools(createState, { name }));
```

**Step 2: Update `frontend/src/store/copilot-store.ts`**

Before:

```typescript
export const useCopilotStore = create<CopilotStore>(
  devtools((set) => ({...}), { name: "copilot-store" })
);
```

After:

```typescript
import { createStore } from "./utils";

export const useCopilotStore = createStore<CopilotStore>(
  "copilot-store",
  (set) => ({...})
);
```

**Step 3: Update All Other Stores**

Apply same pattern to:

- `frontend/src/store/customer-store.ts`
- `frontend/src/store/eval-store.ts`
- `frontend/src/store/eval-detail-store.ts`
- `frontend/src/store/eval-log-store.ts`
- `frontend/src/store/copilot-execution-log-store.ts`

---

## Phase 3: Polish & Future-Proofing

### 7. Convert useEvalStreaming to Server Action

**Objective:** Replace client-side fetch hook with Server Action for type safety.

**Current State:** `frontend/src/hooks/useEvalStreaming.ts` makes direct fetch  
**Effort:** ~1.5 hours  
**Impact:** Type safety, consistency, smaller bundle

#### Steps:

**Step 1: Create Server Action in `frontend/app/eval/actions.ts`**

```typescript
"use server";

export async function runEvalStreamAction(
  params: RunEvalRequest
): Promise<ReadableStream<Uint8Array>> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Existing logic from frontend/app/api/eval/stream/route.ts
  // But return Stream directly instead of Response
}
```

**Step 2: Update Hook to Use Server Action**

Replace direct fetch in `frontend/src/hooks/useEvalStreaming.ts`:

```typescript
"use client";

import { runEvalStreamAction } from "@/app/eval/actions";

export function useEvalStreaming(params: RunEvalRequest) {
  const [state, setState] = useState<EvalStreamState>("initial");

  const start = useCallback(async () => {
    try {
      const stream = await runEvalStreamAction(params);
      const reader = stream.getReader();
      // ... existing streaming logic
    } catch (error) {
      setState("error");
    }
  }, [params]);

  return { start, state };
}
```

**Step 3: Delete API Route**

Remove `frontend/app/api/eval/stream/route.ts` (moved to Server Action).

---

### 8. Enhance Error Handling in Streaming

**Objective:** Add comprehensive error handling to streaming responses.

**Current State:** Some error handling; could be more explicit  
**Effort:** ~2 hours  
**Impact:** Better observability, easier debugging

#### Steps:

**Step 1: Create Error Event Schema**

In `frontend/src/contracts/streaming.ts`:

```typescript
import { z } from "zod";

export const StreamErrorEventSchema = z.object({
  type: z.literal("error"),
  code: z.enum(["TOOL_ERROR", "LLM_ERROR", "VALIDATION_ERROR"]),
  tool: z.string().optional(),
  message: z.string(),
});

export const StreamPhaseEventSchema = z.object({
  type: z.literal("phase:complete"),
  phase: z.string(),
  durationMs: z.number(),
});

export type StreamErrorEvent = z.infer<typeof StreamErrorEventSchema>;
export type StreamPhaseEvent = z.infer<typeof StreamPhaseEventSchema>;
```

**Step 2: Update Route Handlers**

In `frontend/app/api/copilot/stream/route.ts`:

```typescript
// Catch errors and send structured error event
catch (toolError) {
  const errorEvent: StreamErrorEvent = {
    type: "error",
    code: "TOOL_ERROR",
    tool: name,
    message: (toolError as Error).message,
  };

  send("error", errorEvent);

  // Log for monitoring
  logger.error("[Tool execution failed]", {
    tool: name,
    error: (toolError as Error).message,
  });
}
```

**Step 3: Update Client Handling**

In streaming event listeners, handle new error events:

```typescript
source.addEventListener("error", (ev: MessageEvent) => {
  try {
    const data = JSON.parse(ev.data) as StreamErrorEvent;
    // Update UI with error state
    showErrorNotification(data.message);
  } catch {}
});
```

---

## Testing Checklist

### Before Deployment

- [ ] All imports resolve correctly
- [ ] TypeScript compilation succeeds (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] All tests pass (if test suite exists)
- [ ] Manual testing:
  - [ ] Clerk authentication still works
  - [ ] Copilot streaming works end-to-end
  - [ ] Eval dashboard streams properly
  - [ ] Tool invocation succeeds
  - [ ] HMAC signing validates correctly
  - [ ] Error boundaries display correctly on crash

### Regression Tests

- [ ] Authentication flows (sign-in, sign-out, protected routes)
- [ ] Customer listing and selection
- [ ] Copilot streaming (all quick actions)
- [ ] Eval dashboard execution
- [ ] Database operations (seed, read, update)
- [ ] Dark/light mode toggle
- [ ] Mobile responsive design

---

## Rollback Plan

If issues arise during refactoring:

1. **For Phase 1 changes:**

   - Revert to original fetch logic if backend-client breaks
   - Keep ClerkUserSchema definition in both places temporarily

2. **For Phase 2 changes:**

   - Error boundaries can be removed without affecting functionality
   - Validation.ts split can be reverted by moving files back

3. **For Phase 3 changes:**
   - useEvalStreaming hook can coexist with Server Action during transition
   - API routes can be restored if needed

---

## Success Metrics

After completing these refactorings, measure:

| Metric            | Before                        | Target              | Verification                              |
| ----------------- | ----------------------------- | ------------------- | ----------------------------------------- |
| **API Routes**    | 6                             | 5                   | `ls frontend/app/api/*/route.ts \| wc -l` |
| **Duplication**   | High (3 HMAC implementations) | Low (1 centralized) | Code review                               |
| **Type Safety**   | Good                          | Excellent           | No TypeScript errors                      |
| **Bundle Size**   | Current                       | Reduced             | `npm run build` output                    |
| **Lines of Code** | Current                       | Reduced             | `wc -l` on key files                      |
| **Test Coverage** | Current                       | Same or better      | Test report                               |

---

**Next Steps:**

1. Start with Phase 1 (high impact, low effort)
2. Test thoroughly after each phase
3. Monitor for any regressions
4. Document any lessons learned
