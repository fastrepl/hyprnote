import type { Store } from "./main";

/**
 * Unwrap a TinyBase MergeableStore stamp tuple [value, hlc?, hash?] to extract the value.
 * MergeableStore stores all cell values internally as these tuples for synchronization.
 * After OTA updates, data synced via BroadcastChannel may contain these wrapped values.
 * If the input is not a stamp array, returns it as-is.
 */
export function unwrapStampValue<T>(value: T | [T, ...unknown[]]): T {
  if (Array.isArray(value) && value.length >= 1) {
    return value[0];
  }
  return value as T;
}

/**
 * Safely convert a timestamp value to a Date object, handling MergeableStore stamp format.
 * Returns null if the value cannot be converted to a valid date.
 */
export function toSafeDate(value: unknown): Date | null {
  const unwrapped = unwrapStampValue(value);

  if (unwrapped == null) {
    return null;
  }

  if (typeof unwrapped === "number") {
    const date = new Date(unwrapped);
    return isNaN(date.getTime()) ? null : date;
  }

  if (typeof unwrapped === "string") {
    const parsed = Date.parse(unwrapped);
    if (!isNaN(parsed)) {
      return new Date(parsed);
    }
    const numParsed = Number(unwrapped);
    if (!isNaN(numParsed)) {
      return new Date(numParsed);
    }
  }

  return null;
}

/**
 * Safely convert a timestamp value to epoch milliseconds, handling MergeableStore stamp format.
 * Returns 0 if the value cannot be converted.
 */
export function toEpochMs(value: unknown): number {
  const date = toSafeDate(value);
  return date ? date.getTime() : 0;
}

export function collectEnhancedNotesContent(
  store: Store,
  sessionId: string,
): string {
  const contents: string[] = [];
  store.forEachRow("enhanced_notes", (rowId, _forEachCell) => {
    const noteSessionId = store.getCell("enhanced_notes", rowId, "session_id");
    if (noteSessionId === sessionId) {
      const content = store.getCell("enhanced_notes", rowId, "content");
      if (typeof content === "string" && content.trim()) {
        contents.push(content);
      }
    }
  });
  return contents.join(" ");
}
