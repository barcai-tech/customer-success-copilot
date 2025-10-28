# Enhanced Execution Timing Analysis

## Problem Solved

Previously, the detailed execution logs only showed individual tool execution times, but users couldn't see where the remaining time was spent (e.g., if total was 30+ seconds but tools only showed 5 seconds).

## Solution

Added comprehensive timing breakdown showing:

1. **Planning Phase** - LLM analyzing request and creating execution plan
2. **Individual Tool Executions** - Each tool with its duration
3. **Processing & Synthesis** - Overhead for result formatting and LLM synthesis

## Implementation

### Backend Changes (`app/api/copilot/stream/route.ts`)

Added timing markers around three phases:

**Phase 1: Planning**

- Capture start time before LLM planning call
- Capture end time after planning completes
- Calculate `planningPhaseMs`

**Phase 2: Tool Execution**

- Capture start time before tool execution loop
- Each tool already tracks its `tookMs`
- Calculate total tool execution time

**Phase 3: Results Synthesis**

- Track total execution time from start to finish
- Calculate overhead = totalExecutionMs - planningPhaseMs - sumOfToolMs
- Only show overhead if >10ms (filters noise from sub-10ms variations)

### Data Structure

Added `timingInfo` to PlannerResult schema:

```typescript
timingInfo: {
  planningPhaseMs?: number;      // Time spent planning
  toolExecutionMs?: number;      // Total time executing tools
  totalExecutionMs?: number;     // Total time from start to finish
}
```

### Frontend Changes (`src/hooks/useEvalStreaming.ts`)

When a test completes, the hook now:

1. **Extracts timing info** from the full result's `timingInfo` object
2. **Adds Planning Phase step** (if available)
   - Shows as debug level (gray)
   - Title: "Planning Phase"
   - Duration: from LLM planning
3. **Adds Tool Execution steps** (as before)
   - Each tool shows individual duration
4. **Adds Processing & Synthesis step** (calculated)
   - Shows remaining time not accounted for in planning or tools
   - Only shown if overhead > 10ms
   - Indicates time spent on result formatting and synthesis

## Example Output

```
Planning Phase
  Executing successfully
  ⓘ 2.34s

Tool: get_customer_usage
  ✓ Executed successfully
  ⓘ 5.67s

Tool: calculate_health
  ✓ Executed successfully
  ⓘ 3.45s

Processing & Synthesis
  LLM synthesizing results and formatting response
  ⓘ 18.92s  <-- This was the mystery time!

Total Duration: 30.38s
```

## Benefits

✅ **Complete Visibility** - Users now see where every second is spent
✅ **Identifies Bottlenecks** - Clearly shows which phase is slowest
✅ **Overhead Tracking** - Separates tool time from LLM processing time
✅ **Performance Optimization** - Helps identify what to optimize:

- If planning is slow → LLM prompt complexity
- If tools are slow → Backend API performance
- If synthesis is slow → LLM response generation

## Files Modified

- `src/contracts/planner.ts` - Added `timingInfo` field to schema
- `app/api/copilot/stream/route.ts` - Added timing markers and calculations
- `src/hooks/useEvalStreaming.ts` - Extract and display timing in detail store

## Build Status

✅ Builds successfully with no errors
✅ All TypeScript checks pass
✅ No runtime changes needed
