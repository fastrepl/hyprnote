import { commands as templateCommands } from "@hypr/plugin-template";
import type { EnrichedTaskArgsMap, TaskConfig } from ".";

export const titlePrompt: Pick<TaskConfig<"title">, "getUser" | "getSystem"> = {
  getSystem,
  getUser,
};

async function getSystem(_args: EnrichedTaskArgsMap["title"]) {
  const result = await templateCommands.render("title.system", {});

  if (result.status === "error") {
    throw new Error(result.error);
  }

  return result.data;
}

async function getUser(args: EnrichedTaskArgsMap["title"]) {
  const { enhancedMd } = args;

  const result = await templateCommands.render("title.user", {
    enhanced_note: enhancedMd,
  });

  if (result.status === "error") {
    throw new Error(result.error);
  }

  return result.data;
}
