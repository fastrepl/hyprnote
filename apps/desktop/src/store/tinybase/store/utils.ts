import type { Store } from "./main";

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
