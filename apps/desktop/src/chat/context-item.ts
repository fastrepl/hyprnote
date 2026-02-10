export type ContextItem = {
  key: string;
  label: string;
  tooltip: string;
};

export type ContextSource =
  | { type: "account"; email?: string; userId?: string }
  | { type: "device" }
  | { type: "session"; title?: string; date?: string }
  | { type: "transcript"; wordCount?: number }
  | { type: "note"; preview?: string };
