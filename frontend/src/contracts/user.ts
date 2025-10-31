/**
 * User-related type definitions and schemas
 *
 * Used by:
 * - app/eval/actions.ts (listAllUsers)
 * - Evaluation dashboard components
 */

import { z } from "zod";

/**
 * Clerk user representation
 *
 * Maps from Clerk user objects to a simplified schema for internal use.
 */
export const ClerkUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
});

export type ClerkUser = z.infer<typeof ClerkUserSchema>;
