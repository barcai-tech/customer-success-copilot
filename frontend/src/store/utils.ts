/**
 * Store Utilities
 * Helper patterns for Zustand store initialization
 *
 * NOTE: While we initially planned a createStore() factory to wrap devtools
 * middleware, Zustand's type system makes generic wrappers complex.
 * Instead, we recommend this standard pattern for all stores:
 *
 * PATTERN 1: Simple store (no devtools)
 * ────────────────────────────────────
 * export const useMyStore = create<MyState>((set) => ({
 *   // state
 *   // actions
 * }));
 *
 * PATTERN 2: Store with devtools (for debugging)
 * ──────────────────────────────────────────────
 * const initializer = (
 *   set: (fn: (state: MyState) => Partial<MyState>) => void,
 *   get: () => MyState
 * ) => ({
 *   // initial state
 *   // actions using set() and get()
 * });
 *
 * export const useMyStore = create<MyState>()(
 *   devtools(initializer, { name: "MyStoreName" })
 * );
 *
 * Benefits of this approach:
 * - Clearer separation of state initialization and middleware
 * - Better TypeScript support than generic wrappers
 * - Consistent across all stores
 * - Easy to add/remove devtools per store
 */

// No runtime exports - this is documentation only

