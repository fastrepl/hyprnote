export const TABS = [
  "general",
  // "ai",
  // "calendar",
  "notifications",
  "sound",
  // "templates",
  "extensions",
  // "team",
  // "billing",
  "lab",
] as const;

export type Tab = typeof TABS[number];
