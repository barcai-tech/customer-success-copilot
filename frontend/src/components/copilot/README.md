# Copilot Components Architecture

## Overview

The Customer Success Copilot UI is built following **Next.js 16 best practices** with a modular, component-based architecture that separates Server and Client components optimally.

## Architecture Principles

### 1. **Component Composition**

- Small, focused components with single responsibilities
- Server Components by default, Client Components only where needed
- Shared state managed through Zustand store

### 2. **State Management (Zustand)**

- Centralized state in `src/store/copilot-store.ts`
- Minimal re-renders with selective subscriptions
- Type-safe with TypeScript

### 3. **Server Actions**

- Existing server action in `app/actions.ts`
- Invoked from client components via progressive enhancement

## Component Structure

```
src/components/copilot/
├── CopilotDashboard.tsx          # Main composition (Client Component)
├── CustomerSelector.tsx           # Customer selection UI (Client Component)
├── TaskSelector.tsx               # Task type selection (Client Component)
├── CopilotExecutor.tsx           # Execution & orchestration (Client Component)
├── results/
│   ├── HealthSummary.tsx         # Health metrics display (Client Component)
│   ├── EmailDraftCard.tsx        # Email draft with copy (Client Component)
│   ├── ToolExecutionTimeline.tsx # Tool execution progress (Client Component)
│   └── ActionItems.tsx           # Summary & action items (Client Component)
└── index.ts                      # Clean exports
```

## State Management

### Zustand Store (`src/store/copilot-store.ts`)

```typescript
interface CopilotState {
  selectedCustomer: Customer | null;
  selectedTask: TaskType | null;
  status: ExecutionStatus;
  result: PlannerResult | null;
  error: string | null;
  // ... actions
}
```

**Available Actions:**

- `setCustomer(customer)` - Select a customer
- `setTask(task)` - Choose a task type
- `setStatus(status)` - Update execution status
- `setResult(result)` - Store execution results
- `setError(error)` - Handle errors
- `reset()` - Clear all state

## Component Details

### CopilotDashboard

**Type:** Client Component  
**Purpose:** Main composition of all copilot features  
**Usage:**

```tsx
import { CopilotDashboard } from "@/src/components/copilot";
<CopilotDashboard />;
```

### CustomerSelector

**Type:** Client Component  
**Purpose:** Interactive customer selection with visual feedback  
**Features:**

- Quick-select cards for 3 customers
- Visual selection state
- Disabled during execution

### TaskSelector

**Type:** Client Component  
**Purpose:** Task type selection with descriptions  
**Features:**

- 5 task types (health, renewal, qbr, email, churn)
- Icon + description for each
- Hover effects and animations

### CopilotExecutor

**Type:** Client Component  
**Purpose:** Execution orchestration and results display  
**Features:**

- Execute button with state feedback
- Real-time tool execution timeline
- Dynamic results rendering
- Error handling

### Results Components

#### HealthSummary

Displays health score, risk level, and key signals with color coding.

#### EmailDraftCard

Shows email subject and body with individual copy buttons.

#### ToolExecutionTimeline

Real-time visualization of tool execution with timing and status.

#### ActionItems

Summary, recommended actions, and notes display.

## Usage Example

```tsx
// app/page.tsx
import { CopilotDashboard } from "@/src/components/copilot";

export default function Home() {
  return (
    <div>
      <h1>Customer Success Copilot</h1>
      <CopilotDashboard />
    </div>
  );
}
```

## Agentic Workflow

The copilot implements a **multi-step planner** approach:

1. **User Selection** → Customer + Task type
2. **Execution Trigger** → User clicks "Run Copilot"
3. **Agent Planning** → LLM decides tool sequence
4. **Tool Execution** → Sequential tool calls (3-5 max)
5. **Result Synthesis** → Structured output + formatting
6. **UI Rendering** → Dynamic component display

### Tool Execution Flow

```
Customer Selection
      ↓
Task Selection
      ↓
Run Copilot Button
      ↓
Server Action (runPlannerAction)
      ↓
Planner Logic (runPlanner)
      ↓
Tool Invocations:
  - get_customer_usage
  - get_recent_tickets
  - get_contract_info
  - calculate_health
  - generate_email
      ↓
Results Synthesis
      ↓
UI Update (Zustand)
      ↓
Component Rendering
```

## Benefits of This Architecture

### 1. **Performance**

- Server Components reduce client bundle
- Selective hydration only where needed
- Minimal JavaScript to browser

### 2. **Maintainability**

- Clear separation of concerns
- Easy to test individual components
- Logical file structure

### 3. **Scalability**

- Easy to add new task types
- Simple to extend results display
- Flexible state management

### 4. **Developer Experience**

- Type-safe with TypeScript
- Clear component boundaries
- Predictable state flow

## Future Enhancements

### Short Term

- [ ] Add loading skeletons for better UX
- [ ] Implement optimistic UI updates
- [ ] Add keyboard shortcuts
- [ ] Toast notifications for success/error

### Medium Term

- [ ] Streaming results (Server-Sent Events)
- [ ] Result caching and history
- [ ] Multi-customer batch operations
- [ ] Export results to PDF/CSV

### Long Term

- [ ] Real-time collaboration
- [ ] Custom workflow builder
- [ ] AI prompt customization
- [ ] Integration with CRM systems

## Best Practices Applied

✅ **React 19 Patterns**

- `use client` only where necessary
- Server Components for static content
- Progressive enhancement

✅ **Next.js 16 Optimization**

- Server Actions for mutations
- Minimal client-side JavaScript
- Proper component boundaries

✅ **TypeScript**

- Full type safety
- Zod schemas for runtime validation
- Inferred types from Zustand

✅ **Accessibility**

- Semantic HTML
- Keyboard navigation
- Screen reader support
- ARIA labels

✅ **Performance**

- Lazy loading where beneficial
- Memoization for expensive operations
- Optimized re-renders with Zustand
