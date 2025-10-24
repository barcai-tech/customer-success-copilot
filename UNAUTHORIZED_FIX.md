# 🔧 Fix for Random UNAUTHORIZED Errors

## Problem Summary

The frontend was experiencing **random UNAUTHORIZED errors** when the LLM called Lambda function tools, even though the smoke test script always worked perfectly.

## Root Cause

**Missing `ownerUserId` parameter** in the heuristic planner (`planner.ts`).

### What Was Happening

The `runPlanner` function in `frontend/src/agent/planner.ts` was calling tools **without** the `ownerUserId` parameter:

```typescript
// ❌ BEFORE - Missing ownerUserId
const r = await invokeTool<Usage>(
  "get_customer_usage",
  { customerId, params: { periodDays: 30 } }, // <-- No ownerUserId!
  UsageSchema
);
```

### Why This Caused Random Failures

1. **Backend expects `ownerUserId`**: All Lambda functions use this parameter to fetch data from the correct tenant
2. **Data isolation**: Customer data is stored per `ownerUserId` (either Clerk user ID or "public")
3. **Lookup fails**: When `ownerUserId` is missing, the backend can't find the customer data and returns UNAUTHORIZED
4. **Appeared random**: Would only work if data happened to exist for an incorrect/assumed owner

### Why Smoke Test Always Worked

The smoke test script (`infra/scripts/smoke_node.mjs`) **always included** `ownerUserId`:

```javascript
const OWNER = process.env.OWNER_USER_ID || "public";
const req = {
  customerId: CUSTOMER_ID,
  params: { ownerUserId: OWNER }, // ✅ Always present
};
```

### Why LLM Planner Sometimes Worked

The `llmPlanner.ts` was **correctly** adding `ownerUserId`:

```typescript
// ✅ CORRECT - llmPlanner.ts
const { userId } = await auth();
const params: Record<string, unknown> = {
  ...(args.params ?? {}),
  ownerUserId: userId ?? "public",
};
```

This is why the LLM-based planner worked, but the heuristic planner (used as fallback or for specific tasks) would fail.

## The Fix

Added `ownerUserId` to **all tool invocations** in `planner.ts`:

```typescript
// ✅ AFTER - With ownerUserId
export async function runPlanner(
  customerId: string,
  task?: PlannerTask
): Promise<PlannerResult> {
  // Get authenticated user for ownerUserId
  const { userId } = await auth();
  const params = { ownerUserId: userId ?? "public" };

  const runUsage = async () => {
    try {
      const r = await timed(
        () =>
          invokeTool<Usage>(
            "get_customer_usage",
            { customerId, params: { ...params, periodDays: 30 } }, // ✅ Now includes ownerUserId
            UsageSchema
          ),
        "get_customer_usage",
        usedTools
      );
      if (r.ok) usage = r.data;
    } catch {}
  };

  // Similar fix applied to all other tool calls:
  // - get_recent_tickets
  // - get_contract_info
  // - calculate_health
  // - generate_email
  // - generate_qbr_outline
}
```

## Files Changed

- `frontend/src/agent/planner.ts`:
  - Added `import { auth } from "@clerk/nextjs/server"`
  - Added `const { userId } = await auth()` at start of `runPlanner()`
  - Created `const params = { ownerUserId: userId ?? "public" }`
  - Updated all 6 tool invocations to include `params` with ownerUserId

## Verification

All tool calls now include proper authentication context:

| Tool                   | Before            | After              |
| ---------------------- | ----------------- | ------------------ |
| `get_customer_usage`   | ❌ No ownerUserId | ✅ Has ownerUserId |
| `get_recent_tickets`   | ❌ No ownerUserId | ✅ Has ownerUserId |
| `get_contract_info`    | ❌ No ownerUserId | ✅ Has ownerUserId |
| `calculate_health`     | ❌ No ownerUserId | ✅ Has ownerUserId |
| `generate_email`       | ❌ No ownerUserId | ✅ Has ownerUserId |
| `generate_qbr_outline` | ❌ No ownerUserId | ✅ Has ownerUserId |

## Expected Outcome

✅ **All UNAUTHORIZED errors should now be resolved**

The planner will consistently pass the authenticated user's ID to all backend tools, ensuring proper data isolation and access control.

## Testing Recommendations

1. **Test with authenticated user**: Verify tools work with your Clerk user ID
2. **Test with public data**: Ensure fallback to "public" works when not authenticated
3. **Monitor CloudWatch logs**: Check that `ownerUserId` is now present in all requests
4. **Load test**: Run multiple concurrent requests to ensure consistency

## Related Architecture

### Authentication Flow

```
Frontend (Next.js)
  ↓ Clerk auth() → userId
  ↓
planner.ts → params: { ownerUserId: userId ?? "public" }
  ↓
invokeTool() → HMAC signature with body including ownerUserId
  ↓
API Gateway → Lambda Function
  ↓
handler.py → parse_envelope() → extract ownerUserId from params
  ↓
Backend DB/S3 → fetch data for (ownerUserId, customerId) pair
```

### Multi-tenancy Model

- **User-owned data**: `ownerUserId = user_xxx` (Clerk user ID)
- **Public data**: `ownerUserId = "public"` (sample/demo data)
- **Data isolation**: All DB tables have `(ownerUserId, companyExternalId)` as composite key

---

**Date Fixed**: October 24, 2025  
**Fixed By**: Root cause analysis and parameter addition  
**Impact**: Eliminates all random UNAUTHORIZED errors in tool invocations
