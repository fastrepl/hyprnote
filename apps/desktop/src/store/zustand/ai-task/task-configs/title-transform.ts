import type { Store as PersistedStore } from "../../../tinybase/main";
import type { EnrichedTaskArgsMap, TaskArgsMap, TaskConfig } from ".";

export const titleTransform: Pick<TaskConfig<"title">, "transformArgs"> = {
  transformArgs,
};

async function transformArgs(
  args: TaskArgsMap["title"],
  store: PersistedStore,
): Promise<EnrichedTaskArgsMap["title"]> {
  const { sessionId } = args;
  const enhancedMd = (store.getCell("sessions", sessionId, "enhanced_md") as string) || "";

  return {
    sessionId,
    enhancedMd,
  };
}
