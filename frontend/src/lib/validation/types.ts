import { z } from "zod";
import {
  customerFormSchema,
  customerFormSchemaTransformed,
  plannerFormSchema,
  evalFormSchema,
} from "./schemas";

/**
 * Exported Types
 * Type-safe inference from Zod schemas
 */

export type CustomerFormData = z.infer<typeof customerFormSchema>;
export type CustomerFormTransformed = z.infer<
  typeof customerFormSchemaTransformed
>;

export type PlannerFormData = z.infer<typeof plannerFormSchema>;
export type EvalFormData = z.infer<typeof evalFormSchema>;
