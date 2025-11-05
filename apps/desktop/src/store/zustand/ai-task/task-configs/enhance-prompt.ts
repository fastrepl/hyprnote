import { commands as templateCommands } from "@hypr/plugin-template";
import type { TaskArgsMapTransformed, TaskConfig } from ".";

export const enhancePrompt: Pick<TaskConfig<"enhance">, "getUser" | "getSystem"> = {
  getSystem,
  getUser,
};

async function getSystem(args: TaskArgsMapTransformed["enhance"]) {
  const result = await templateCommands.render("enhance.system", {
    hasTemplate: !!args.template,
  });

  if (result.status === "error") {
    throw new Error(result.error);
  }

  return result.data;
}

async function getUser(args: TaskArgsMapTransformed["enhance"]) {
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
