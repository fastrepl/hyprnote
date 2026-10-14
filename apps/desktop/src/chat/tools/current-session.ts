import type { ToolDependencies } from "./types";

export type ChatToolContext = {
  currentSessionId: string | undefined;
  mentionedFolderPaths: string[];
};

function isChatToolContext(value: unknown): value is ChatToolContext {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const sessionOk =
    record.currentSessionId === undefined ||
    typeof record.currentSessionId === "string";
  const folders = record.mentionedFolderPaths;
  const foldersOk =
    folders === undefined ||
    (Array.isArray(folders) &&
      folders.every((path) => typeof path === "string"));
  return sessionOk && foldersOk;
}

function mentionedFolderPaths(context: ChatToolContext): string[] {
  return Array.isArray(context.mentionedFolderPaths)
    ? context.mentionedFolderPaths
    : [];
}

export type ToolCallOptions = { experimental_context?: unknown };

// Defaults to the note attached to the triggering user message.
export function resolveCurrentSessionId(
  deps: Pick<ToolDependencies, "getSessionId">,
  options: ToolCallOptions | undefined,
): string | undefined {
  const context = options?.experimental_context;
  if (isChatToolContext(context)) {
    return context.currentSessionId;
  }
  return deps.getSessionId();
}

// Folders @-mentioned in the triggering user message scope folder-aware
// tools; the sidebar folder filter applies when none were mentioned.
export function resolveFolderPaths(
  deps: Pick<ToolDependencies, "getFolderFilter">,
  options: ToolCallOptions | undefined,
): string[] {
  const context = options?.experimental_context;
  if (isChatToolContext(context)) {
    const mentioned = mentionedFolderPaths(context);
    if (mentioned.length > 0) {
      return mentioned;
    }
  }
  const ambient = deps.getFolderFilter?.() ?? null;
  return ambient ? [ambient] : [];
}

export function resolveActiveEnhancedNoteId(
  deps: Pick<ToolDependencies, "getSessionId" | "getEnhancedNoteId">,
  sessionId: string,
): string | undefined {
  return deps.getSessionId() === sessionId
    ? deps.getEnhancedNoteId()
    : undefined;
}
