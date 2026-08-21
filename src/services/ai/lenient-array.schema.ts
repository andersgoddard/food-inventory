import { z } from 'zod';

// AI output arrays are validated item-by-item so one malformed item doesn't discard an otherwise-valid batch.
export function parseLenientArray<T extends z.ZodTypeAny>(
  schema: T,
  items: unknown,
  context: string
): z.infer<T>[] {
  if (!Array.isArray(items)) return [];
  const valid: z.infer<T>[] = [];
  for (const item of items) {
    const result = schema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      console.warn(`[${context}] dropping invalid AI output item`, { item, issues: result.error.issues });
    }
  }
  return valid;
}
