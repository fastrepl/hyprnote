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
  const value = store.getCell("sessions", sessionId, "enhanced_md");
  return typeof value === "string" ? value : "";
}
