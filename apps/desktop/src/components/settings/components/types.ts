export const TABS = [
  "general",
  "profile",
  "ai",
  "calendar",
  "notifications",
  "templates",
  "extensions",
  "team",
  "billing",
] as const;

export type Tab = typeof TABS[number];
