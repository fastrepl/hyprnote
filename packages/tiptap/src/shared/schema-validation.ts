import { getSchema } from "@tiptap/core";
import type { JSONContent } from "@tiptap/react";

import { getExtensions } from "./extensions";

export type SchemaValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateJsonContent(json: JSONContent): SchemaValidationResult {
  try {
    const schema = getSchema(getExtensions());
    schema.nodeFromJSON(json);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function assertValidSchema(json: JSONContent): void {
  const result = validateJsonContent(json);
  if (!result.valid) {
    throw new Error(`Schema validation failed: ${result.error}`);
  }
}
