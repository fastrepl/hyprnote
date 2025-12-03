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
  const language = getLanguage(store);
  return { ...args, enhancedMd, language };
}

function readEnhancedMarkdown(store: MainStore, sessionId: string): string {
  const value = store.getCell("sessions", sessionId, "enhanced_md");
  return typeof value === "string" ? value : "";
}

function getLanguage(store: MainStore): string {
  const value = store.getValue("ai_language");
  return typeof value === "string" && value.length > 0 ? value : "en";
}
