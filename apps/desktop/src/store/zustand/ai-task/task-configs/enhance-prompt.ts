import { commands as templateCommands } from "@hypr/plugin-template";
import type { EnrichedTaskArgsMap, TaskConfig } from ".";

export const enhancePrompt: Pick<TaskConfig<"enhance">, "getUser" | "getSystem"> = {
  getSystem,
  getUser,
};

async function getSystem(args: EnrichedTaskArgsMap["enhance"]) {
  const result = await templateCommands.render("enhance.system", {
    hasTemplate: !!args.template,
  });

  if (result.status === "error") {
    throw new Error(result.error);
  }

  return result.data;
}

async function getUser(args: EnrichedTaskArgsMap["enhance"]) {
  const { rawMd, sessionData, participants, template, segments } = args;

  const result = await templateCommands.render("enhance.user", {
    content: rawMd,
    session: sessionData,
    participants,
    template,
    segments,
  });

  if (result.status === "error") {
    throw new Error(result.error);
  }

  return result.data;
}
