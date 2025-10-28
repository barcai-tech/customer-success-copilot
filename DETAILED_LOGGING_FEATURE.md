# Detailed Execution Logging Feature

## Overview

Implemented a comprehensive drill-down capability for evaluation tasks to help identify performance bottlenecks. Users can now inspect detailed execution steps and tool timings for each evaluation result.

## Architecture

### State Management (`eval-detail-store.ts`)

- **Zustand store** with hierarchical step logging
- Tracks nested execution steps with tree structure support
- Each step has: `id`, `timestamp`, `level`, `title`, `description`, `durationMs`, `children[]`
- Methods:
  - `startResult(resultId, customerName, action)` - Initialize log
  - `addStep(resultId, step)` - Add top-level step
  - `addChildStep(resultId, parentStepId, step)` - Add nested step
  - `endResult(resultId)` - Mark complete, calculate total duration
  - `getResultLog(resultId)` - Retrieve log
  - `clearLogs()` - Reset all

### UI Components

#### `DetailedResultLogView.tsx` (Hierarchical Viewer)

- Recursive component for rendering nested execution steps
- Features:
  - Expand/collapse functionality with chevron icons
  - Color-coded levels:
    - ✓ Green: Success
    - ✗ Red: Error
    - ⚠ Yellow: Warning
    - → Gray: Debug
    - • Blue: Info
  - Indentation based on nesting level
  - Duration displayed in seconds per step
  - Monospace font for code appearance
  - Root level expanded by default, children collapsed

#### `DetailedLogModal.tsx` (Modal Container)

- Shadcn Dialog wrapper
- Props: `resultId`, `isOpen`, `onClose`
- Reads from detail log store to display log data
- Shows "No execution data available" if log not found

### Integration

#### `ResultsDisplay.tsx` (Updated)

- Added "Details" button (chevron icon) to each result row
- Manages modal open/close state
- Integrates `DetailedLogModal` component
- Button click opens modal with execution timeline

#### `useEvalStreaming.ts` (Enhanced Hook)

- Captures `usedTools` data from evaluation results
- Converts tool execution data to execution steps
- Populates detail log store when test completes
- Each tool call becomes an execution step with:
  - Tool name in title
  - Success/error status as level
  - Duration in milliseconds
  - Error message (if failed) in description

## Data Flow

```
1. User runs evaluation → /api/eval/stream
2. Stream calls → /api/copilot/stream (per task)
3. Copilot stream executes → planner (Server Action)
4. Planner calls → tools (get_customer_usage, etc.)
5. Each tool returns → timing data (tookMs)
6. Final result includes → usedTools[] with timings
7. useEvalStreaming hook captures → usedTools data
8. Detail store populated → with execution steps
9. User clicks "Details" → Modal opens with drill-down view
10. User expands steps → Sees nested execution timeline
```

## Usage

### From Evaluation Results

1. Run an evaluation → View results table
2. Click "Details" button (→ icon) on any result row
3. Modal opens showing execution timeline
4. Expand/collapse steps to drill down into details
5. View timing for each tool invocation
6. Identify performance bottlenecks

### Example Execution Timeline

```
✓ Tool: get_customer_usage (234.50ms)
✓ Tool: get_recent_tickets (567.89ms)
✓ Tool: get_contract_info (123.45ms)
✓ Tool: calculate_health (456.78ms)
```

## Files Created/Modified

### New Files

- `src/store/eval-detail-store.ts` - Detail log state management
- `src/components/eval/DetailedResultLogView.tsx` - Hierarchical viewer
- `src/components/eval/DetailedLogModal.tsx` - Modal wrapper

### Modified Files

- `src/components/eval/ResultsDisplay.tsx` - Added Details button and modal integration
- `src/hooks/useEvalStreaming.ts` - Enhanced to populate detail store
- `frontend/package.json` - No changes (all dependencies already available)

## Build Status

✅ All files compile successfully with no errors
✅ TypeScript strict mode passes
✅ ESLint validation complete

## Next Steps (Optional Enhancements)

1. **Deeper Nesting**: If planner is modified to emit sub-steps (e.g., API calls within tool), use `addChildStep()` to create hierarchical tree
2. **Tool Arguments**: Add tool input parameters to execution step description
3. **Tool Responses**: Show abbreviated tool response data in execution steps
4. **Timeline View**: Alternative visualization showing execution over time
5. **Export Details**: Add button to export detailed execution log as JSON
6. **Performance Metrics**: Calculate cumulative percentages per tool type
7. **Filtering**: Filter execution steps by status, duration, or tool name
8. **Comparison**: Compare execution timings across multiple runs

## Implementation Notes

- Uses existing `usedTools` data from planner (no planner code changes needed)
- Non-invasive - detail logging happens purely on the frontend
- Store uses Zustand devtools middleware for debugging
- Modal only shows data that exists (no unnecessary placeholders)
- Durations formatted consistently in seconds across all views
- Supports both successful and failed tool executions
