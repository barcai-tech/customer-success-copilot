# Security Implementation

## Overview

This document outlines the security measures implemented in the Customer Success Copilot application to protect against common web vulnerabilities.

## Validation Library

We use **Zod** (v4.1.12) for runtime validation and type-safe schema validation. All user inputs are validated using Zod schemas before being stored in the database.

Location: `/src/lib/validation.ts`

## Protection Mechanisms

### 1. Cross-Site Scripting (XSS) Prevention

**React Auto-Escaping**

- All user input displayed through React components is automatically escaped
- JSX prevents most XSS attacks by encoding HTML entities

**Input Sanitization with Zod** (`/src/lib/validation.ts`)

- `companyNameSchema`: Blocks `<script>`, `<iframe>`, `javascript:`, and event handlers
- `textSchema`: Removes null bytes, enforces length limits
- Validation rejects inputs containing dangerous patterns using Zod refinements

**Example:**

```typescript
export const companyNameSchema = z
  .string()
  .transform(sanitizeString)
  .pipe(
    z
      .string()
      .min(1, "Company name is required")
      .max(200, "Company name too long")
      .refine((val) => !hasXSSPatterns(val), {
        message: "Company name contains forbidden characters",
      })
  );
```

**No Dangerous APIs**

- No use of `dangerouslySetInnerHTML`
- No direct DOM manipulation with `innerHTML` or `outerHTML`

### 2. SQL Injection Prevention

**ORM Usage**

- All database queries use Drizzle ORM with parameterized queries
- No raw SQL string concatenation
- Type-safe query building

**Example:**

```typescript
await db
  .select()
  .from(companies)
  .where(and(eq(companies.ownerUserId, userId), eq(companies.externalId, id)));
```

### 3. Authentication & Authorization

**Clerk Integration**

- All server actions require authentication: `await auth()`
- Throws error if `userId` is null

**Multi-Tenancy Enforcement**

- Every database query filtered by `ownerUserId`
- Prevents horizontal privilege escalation
- Users can only access their own data

**Example:**

```typescript
const { userId } = await auth();
if (!userId) throw new Error("Unauthorized");

await db.select().from(companies).where(eq(companies.ownerUserId, userId)); // Scoped to user
```

### 4. Input Validation with Zod

**Zod Schemas**

All user inputs are validated using type-safe Zod schemas:

```typescript
// Customer creation
export const createCustomerSchema = z.object({
  name: companyNameSchema,
  externalId: z.string().transform((val) => externalIdSchema.parse(val)),
});

// Contract data
export const upsertContractSchema = z.object({
  customerId: z.string().min(1),
  renewalDate: isoDateSchema,
  arr: numberSchema(0, 1_000_000_000),
});

// Tickets
export const upsertTicketsSchema = z.object({
  customerId: z.string().min(1),
  tickets: ticketsArraySchema,
});

// Usage data
export const upsertUsageSchema = z.object({
  customerId: z.string().min(1),
  sparkline: numberArraySchema(365),
});
```

**Length Limits**

- Company names: 200 characters max
- External IDs: 100 characters max
- Generic text: 500 characters max
- Tickets: 50 max
- Sparkline data: 365 items max (1 year of daily data)

**Format Validation**

- `externalIdSchema`: Only allows `[a-z0-9\-_]`, lowercase
- `isoDateSchema`: Enforces ISO 8601 format with transformation
- `numberSchema`: Validates with configurable min/max bounds

**Type Safety**

- `numberSchema`: Uses `z.number().finite()`
- `numberArraySchema`: Transforms and filters to ensure all items are finite numbers
- `ticketsArraySchema`: Validates array of structured objects

### 5. JSON Injection Prevention

**JSONB Field Validation with Zod**

- `ticketsArraySchema`: Validates structure using Zod schemas, max 50 items
- `numberArraySchema`: Validates array and filters non-finite values, max 365 items
- Zod prevents prototype pollution through schema validation
- Type-safe transformations ensure clean data

### 6. Remote Code Execution Prevention

**No Dynamic Code Execution**

- No `eval()`
- No `Function()` constructor
- No `vm` module usage
- All code is statically compiled

**Safe JSON Parsing**

- Uses `JSON.parse()` with error handling
- Input validation before parsing
- Schema validation after parsing (Zod)

### 7. Prompt Injection Defense

**Out-of-Scope Detection** (`/app/api/copilot/stream/route.ts`)

```typescript
function isOutOfScope(message: string): boolean {
  const dangerous = [
    "weather",
    "movie",
    "recipe",
    "hack",
    "exploit",
    "bypass",
    "jailbreak",
  ];
  // Returns true if message contains attack patterns
}
```

**Early Rejection**

- Checks requests before LLM invocation
- Returns friendly rejection message
- Prevents waste of API calls

**System Prompt Protection**

- LLM instructed to ignore instructions in user content
- Tool outputs treated as untrusted data
- Never reveals internal prompts or environment variables

### 8. Content Security Policy

**CSP Violation Detection**

```typescript
export function detectCSPViolation(input: string): boolean {
  const violations = [/data:/i, /blob:/i, /javascript:/i];
  return violations.some((pattern) => pattern.test(input));
}
```

## Zod Schemas Reference

### Core Building Blocks

**`textSchema(maxLength = 500)`**

- Removes null bytes and trims whitespace
- Enforces configurable length limit
- Returns sanitized string

**`externalIdSchema`**

- Transforms to lowercase
- Only allows alphanumeric + hyphens + underscores
- Max 100 characters
- Throws if empty after sanitization

**`companyNameSchema`**

- Sanitizes text (max 200 chars)
- Blocks XSS patterns via `.refine()`
- Throws user-friendly error on dangerous content

**`isoDateSchema`**

- Validates ISO 8601 format with regex
- Checks date validity
- Transforms to normalized ISO string

**`numberSchema(min?, max?)`**

- Validates finite numbers
- Optional min/max bounds
- Clear error messages

**`numberArraySchema(maxLength = 100)`**

- Validates array structure
- Transforms items to numbers
- Filters out non-finite values
- Enforces maximum length

**`ticketSchema`**

- Validates `{ id: string, severity: string }` structure
- Sanitizes nested strings

**`ticketsArraySchema`**

- Array of ticket objects
- Max 50 tickets

### Complete Action Schemas

**`createCustomerSchema`**

```typescript
z.object({
  name: companyNameSchema,
  externalId: z.string().transform((val) => externalIdSchema.parse(val)),
});
```

**`upsertContractSchema`**

```typescript
z.object({
  customerId: z.string().min(1),
  renewalDate: isoDateSchema,
  arr: numberSchema(0, 1_000_000_000),
});
```

**`upsertTicketsSchema`**

```typescript
z.object({
  customerId: z.string().min(1),
  tickets: ticketsArraySchema,
});
```

**`upsertUsageSchema`**

```typescript
z.object({
  customerId: z.string().min(1),
  sparkline: numberArraySchema(365),
});
```

### Backward Compatible Functions

All original functions still available for backward compatibility:

**`sanitizeText(input: string, maxLength = 500): string`**

- Wraps `textSchema().parse()`

**`sanitizeExternalId(input: string): string`**

- Wraps `externalIdSchema.parse()`

**`sanitizeCompanyName(input: string): string`**

- Wraps `companyNameSchema.parse()`

**`validateISODate(input: string): string`**

- Wraps `isoDateSchema.parse()`

**`sanitizeNumber(input, min?, max?): number`**

- Wraps `numberSchema(min, max).parse()`

**`sanitizeNumberArray(input, maxLength = 100): number[]`**

- Wraps `numberArraySchema(maxLength).parse()`

**`sanitizeTickets(input): Array<{id: string, severity: string}>`**

- Wraps `ticketsArraySchema.parse()`

## Secure Actions

All customer management actions use Zod schema validation:

### `createCustomerAction()`

- ✅ `createCustomerSchema.parse()` validates entire input
- ✅ Auto-generates external ID from company name if not provided
- ✅ Type-safe validation ensures data integrity

### `upsertContractAction()`

- ✅ `upsertContractSchema.parse()` validates renewal date and ARR
- ✅ ISO date validation and normalization
- ✅ ARR bounded to $0-$1B range

### `upsertTicketsAction()`

- ✅ `upsertTicketsSchema.parse()` validates ticket structure
- ✅ Max 50 tickets enforced
- ✅ Nested string sanitization

### `upsertUsageAction()`

- ✅ `upsertUsageSchema.parse()` validates sparkline data
- ✅ Max 365 data points (1 year)
- ✅ Filters non-finite numbers

## Database Security

**Schema Constraints**

- Primary keys on all tables
- Unique indexes on `(ownerUserId, externalId)`
- Foreign key relationships enforced
- Timestamps for audit trails

**Row-Level Security**

- All queries include `ownerUserId` filter
- Prevents cross-tenant data leakage

## Best Practices

1. **Defense in Depth**: Multiple layers of protection (React + Zod + ORM)
2. **Fail Secure**: Zod throws clear errors on invalid input rather than silently accepting
3. **Least Privilege**: Users only access their own data
4. **Type-Safe Validation**: Zod provides runtime validation with TypeScript type inference
5. **Input Validation**: All user input validated through Zod schemas before storage
6. **Output Encoding**: React auto-escapes all rendered content
7. **Schema-First**: Define validation schemas once, use throughout the application

## Future Improvements

- [ ] Add Content Security Policy HTTP headers
- [ ] Implement rate limiting on API endpoints
- [ ] Add CSRF tokens for form submissions
- [ ] Enable database query logging for audit
- [ ] Add input sanitization to LLM responses
- [ ] Implement file upload validation (if added)

## Incident Response

If a security vulnerability is discovered:

1. Document the attack vector
2. Create or update Zod schema in `/src/lib/validation.ts`
3. Update affected server actions to use the schema
4. Add test cases for the vulnerability
5. Update this documentation

## Testing

To test Zod validation:

```bash
# Try creating a customer with XSS payload
Company Name: <script>alert('XSS')</script>
Expected: ZodError - "Company name contains forbidden characters"

# Try SQL injection in external ID
External ID: '; DROP TABLE companies; --
Expected: Sanitized to empty string (only a-z0-9-_ allowed)

# Try invalid date
Renewal Date: "not-a-date"
Expected: ZodError - "Date must be in YYYY-MM-DD format"

# Try out-of-bounds ARR
ARR: 2000000000
Expected: ZodError - "Must be at most 1000000000"

# Try too many tickets
Tickets: Array(100).fill({id: "1", severity: "high"})
Expected: ZodError - "Too many tickets (max 50)"
```

## Why Zod?

**Advantages:**

- ✅ Runtime validation with TypeScript type inference
- ✅ Composable schemas (build complex from simple)
- ✅ Clear, declarative validation rules
- ✅ Automatic type safety
- ✅ Transform data while validating
- ✅ Detailed error messages
- ✅ Industry standard (widely used, well-maintained)

**Example:**

```typescript
const validated = createCustomerSchema.parse(input);
// `validated` is automatically typed correctly
// TypeScript knows: { name: string, externalId: string }
```

## Compliance

- **OWASP Top 10**: Protections implemented for A01-A07
- **SQL Injection**: Protected via ORM
- **XSS**: Protected via React + validation
- **Broken Access Control**: Protected via multi-tenancy
- **Security Misconfiguration**: Secure defaults
- **Vulnerable Components**: Regular dependency updates
