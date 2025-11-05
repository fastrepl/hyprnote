import type { Store as MainStore } from "../../../tinybase/main";
import type { TaskArgsMap, TaskArgsMapTransformed, TaskConfig } from ".";

export const titleTransform: Pick<TaskConfig<"title">, "transformArgs"> = {
  transformArgs,
};

async function transformArgs(
  args: TaskArgsMap["title"],
  store: MainStore,
): Promise<TaskArgsMapTransformed["title"]> {
  const enhancedMd = store.getCell(
    "sessions",
    args.sessionId,
    "enhanced_md",
  ) as string || "";

  return { ...args, enhancedMd };
}
