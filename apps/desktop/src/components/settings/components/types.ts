export const TABS = [
  "general",
  "profile",
  "ai",
  "calendar",
  "notifications",
  "permissions",
  "templates",
  "extensions",
  // "team",
  // "billing",
  "lab",
] as const;

export type Tab = typeof TABS[number];
