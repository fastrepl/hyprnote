import {
  AIMessage,
  type BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Adapters, render } from "promptl-ai";

export function loadPrompt(dirname: string, name = "prompt"): string {
  return readFileSync(join(dirname, `${name}.promptl`), "utf-8");
}

export async function compilePrompt(
  prompt: string,
  params: Record<string, unknown> = {},
): Promise<BaseMessage[]> {
  const { messages } = await render({
    prompt,
    parameters: params,
    adapter: Adapters.openai,
  });

  return messages.map((message) => {
    const content =
      typeof message.content === "string"
        ? message.content
        : message.content.map((c) => ("text" in c ? c.text : "")).join("");

    switch (message.role) {
      case "system":
        return new SystemMessage(content);
      case "user":
        return new HumanMessage(content);
      case "assistant":
        return new AIMessage(content);
      default:
        return new HumanMessage(content);
    }
  });
}
