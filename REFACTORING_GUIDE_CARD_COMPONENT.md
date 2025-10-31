# Refactoring Guide: Shadcn Card Component Migration

**Priority:** 🟡 Medium (Optional Enhancement)  
**Effort:** ~30 minutes  
**Impact:** Better code consistency, easier theming

---

## Overview

This guide shows how to replace custom card divs with shadcn `Card` component for better consistency and maintainability.

---

## Step 1: Add Card Component (if not present)

```bash
# The Card component should already be available in your project
# Located at: src/components/ui/card.tsx

# If needed, you can regenerate it:
# npx shadcn-ui@latest add card
```

---

## Step 2: Component Updates

### 2a. ResultsSummaryCard.tsx

**Before:**
```tsx
<div
  className={cn(
    "border-2 rounded-lg p-6 space-y-6 transition-all duration-200",
    priorityColors
  )}
>
  {/* Header, metrics, signals, actions, notes */}
</div>
```

**After:**
```tsx
import { Card } from "@/src/components/ui/card";

<Card className={cn("transition-all duration-200", priorityColors)}>
  {/* Header, metrics, signals, actions, notes */}
</Card>
```

**Benefits:**
- Removes manual border/padding/radius management
- Consistent with other cards in the app
- Better dark mode support

---

### 2b. CustomerContextCard.tsx

**Before:**
```tsx
<div className="rounded-lg border border-foreground/10 bg-foreground/5 p-4 space-y-3">
  {/* content */}
</div>
```

**After:**
```tsx
import { Card, CardContent } from "@/src/components/ui/card";

<Card className="bg-foreground/5">
  <CardContent className="pt-6">
    {/* content */}
  </CardContent>
</Card>
```

---

### 2c. CopilotExecutor.tsx (Error State)

**Before:**
```tsx
<div className="flex items-start gap-3 p-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
  {/* error content */}
</div>
```

**After:**
```tsx
import { Card } from "@/src/components/ui/card";

<Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
  <div className="flex items-start gap-3 p-4">
    {/* error content */}
  </div>
</Card>
```

---

### 2d. EmptyCustomersState.tsx

**Before:**
```tsx
<div className="grid grid-cols-3 gap-3 py-4 px-4 bg-white/50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-700/50">
  {/* empty state content */}
</div>
```

**After:**
```tsx
import { Card, CardContent } from "@/src/components/ui/card";

<Card className="bg-white/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700/50">
  <CardContent className="pt-6">
    <div className="grid grid-cols-3 gap-3">
      {/* empty state content */}
    </div>
  </CardContent>
</Card>
```

---

### 2e. DetailedResultLogView.tsx

**Before:**
```tsx
<div className="flex items-center gap-4 bg-linear-to-r from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
  {/* content */}
</div>
```

**After:**
```tsx
import { Card } from "@/src/components/ui/card";

<Card className="bg-linear-to-r from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 border-slate-200 dark:border-slate-800">
  <div className="flex items-center gap-4 p-4">
    {/* content */}
  </div>
</Card>
```

---

## Step 3: Testing

After making changes, verify:

```bash
# 1. Build still works
npm run build

# 2. No TypeScript errors
npx tsc --noEmit

# 3. Lint passes
pnpm lint

# 4. Visual verification (manual)
# - Check dark/light mode switching
# - Verify card borders and spacing
# - Test responsive layout
```

---

## Card Component API Reference

```tsx
import { Card, CardHeader, CardContent, CardFooter } from "@/src/components/ui/card";

// Basic usage
<Card>
  <CardContent>Content here</CardContent>
</Card>

// Full structure
<Card className="custom-classes">
  <CardHeader className="pb-3">
    <CardTitle>Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    Body content
  </CardContent>
  <CardFooter>
    Footer content (optional)
  </CardFooter>
</Card>
```

---

## Before/After Comparison

### Visual Consistency
- **Before:** Mix of custom divs with different padding/border values
- **After:** Unified Card component with consistent styling

### Code Maintainability
- **Before:** `className="rounded-lg border p-4 bg-..."` repeated 5+ times
- **After:** `<Card>` component, theme changes in one place

### Dark Mode
- **Before:** Manual `dark:` prefixes for each card
- **After:** Card component handles dark mode automatically

---

## Rollout Plan

**Option 1: Gradual (Recommended)**
1. Update `ResultsSummaryCard.tsx` (most visible)
2. Test in dev/staging
3. Update remaining cards
4. Full test pass
5. Deploy

**Option 2: All at Once**
1. Update all files
2. Run full test suite
3. Deploy

---

## FAQ

**Q: Will this change the appearance?**  
A: No, the Card component uses the same styling. It's a refactoring, not a redesign.

**Q: Do I need to install anything?**  
A: No, Card should already be in your shadcn components. If not, run `npx shadcn-ui@latest add card`.

**Q: What if something breaks?**  
A: Easy rollback - just revert the git changes. The component API is stable.

**Q: Is this worth doing now?**  
A: It's optional. Current code works fine. This is for long-term maintainability.

---

## Estimated Time

- **Planning:** 5 min
- **Coding:** 15 min
- **Testing:** 10 min
- **Total:** ~30 minutes

---

**Status:** Optional refactoring guide  
**Recommendations:** Can be deferred to later or done immediately for consistency
