import { commands as templateCommands } from "@hypr/plugin-template";
import type { Store as PersistedStore } from "../../../tinybase/main";
import type { TaskArgsMap, TaskConfig } from ".";

export const titlePrompt: Pick<TaskConfig<"title">, "getUser" | "getSystem"> = {
  getSystem,
  getUser,
};

async function getSystem(_args: TaskArgsMap["title"]) {
  const result = await templateCommands.render("title.system", {});

  if (result.status === "error") {
    throw new Error(result.error);
  }

  return result.data;
}

async function getUser(args: TaskArgsMap["title"], store: PersistedStore) {
  const { sessionId } = args;
  const enhancedMd = (store.getCell("sessions", sessionId, "enhanced_md") as string) || "";

  const result = await templateCommands.render("title.user", {
    enhanced_note: enhancedMd,
  });

  if (result.status === "error") {
    throw new Error(result.error);
  }

  return result.data;
}
