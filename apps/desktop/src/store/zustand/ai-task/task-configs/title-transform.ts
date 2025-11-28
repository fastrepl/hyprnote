import type { TaskArgsMap, TaskArgsMapTransformed, TaskConfig } from ".";
import type { Store as MainStore } from "../../../tinybase/main";

export const titleTransform: Pick<TaskConfig<"title">, "transformArgs"> = {
  transformArgs,
};

async function transformArgs(
  args: TaskArgsMap["title"],
  store: MainStore,
): Promise<TaskArgsMapTransformed["title"]> {
  const enhancedMd = readEnhancedMarkdown(store, args.sessionId);
  return { ...args, enhancedMd };
}

function readEnhancedMarkdown(store: MainStore, sessionId: string): string {
  const contents: string[] = [];
  store.forEachRow("enhanced_notes", (rowId, _forEachCell) => {
    const noteSessionId = store.getCell("enhanced_notes", rowId, "session_id");
    if (noteSessionId === sessionId) {
      const content = store.getCell("enhanced_notes", rowId, "content");
      if (typeof content === "string" && content) {
        contents.push(content);
      }
    }
  });
  return contents.join("\n\n");
}
