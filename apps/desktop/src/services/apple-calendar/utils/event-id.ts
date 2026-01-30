import type { AppleEvent } from "@hypr/plugin-apple-calendar";

export type CalendarProvider = "apple" | "google" | "outlook";

export interface EventIdComponents {
  provider: CalendarProvider;
  stableId: string;
  startedAt: string;
}

/**
 * Creates a deterministic event ID for TinyBase storage.
 *
 * Format: {provider}:{stableId}:{isoDate}
 * Example: apple:ABC123:2026-01-30T14:00:00.000Z
 *
 * This ensures:
 * - No duplicates across concurrent app instances
 * - Recurring event occurrences are properly differentiated
 * - Provider-agnostic design for future multi-calendar support
 */
export function createEventId(components: EventIdComponents): string {
  const { provider, stableId, startedAt } = components;
  return `${provider}:${stableId}:${startedAt}`;
}

/**
 * Parses an event ID back into its components.
 * Returns null if the ID doesn't match the expected format.
 */
export function parseEventId(eventId: string): EventIdComponents | null {
  const firstColonIndex = eventId.indexOf(":");
  if (firstColonIndex === -1) return null;

  const provider = eventId.slice(0, firstColonIndex);
  const rest = eventId.slice(firstColonIndex + 1);

  const lastColonIndex = rest.lastIndexOf(":");
  if (lastColonIndex === -1) return null;

  const stableId = rest.slice(0, lastColonIndex);
  const startedAt = rest.slice(lastColonIndex + 1);

  if (!provider || !stableId || !startedAt) return null;

  return { provider: provider as CalendarProvider, stableId, startedAt };
}

/**
 * Creates event ID from Apple EventKit data.
 * Uses calendar_item_identifier which is stable across recurring event occurrences.
 */
export function createAppleEventId(
  appleEvent: AppleEvent,
  startedAt: string,
): string {
  return createEventId({
    provider: "apple",
    stableId: appleEvent.calendar_item_identifier,
    startedAt,
  });
}

/**
 * Checks if an event ID uses the old UUID format.
 * Old format: random UUID (e.g., "123e4567-e89b-12d3-a456-426614174000")
 * New format: provider:stableId:date (e.g., "apple:ABC:2026-01-30T14:00:00.000Z")
 */
export function isLegacyEventId(eventId: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(eventId);
}
