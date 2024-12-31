import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { fetch } from "@tauri-apps/plugin-http";

const openai = createOpenAI({
  baseURL: "https://api.openai.com/v1",
  apiKey: "",
  fetch,
});

export async function enhanceNote(_note: any) {
  const prompt =
    "Generate 3 hero descriptions for a fantasy role playing game.";
  const schema = z.array(
    z.object({
      name: z.string(),
      class: z
        .string()
        .describe("Character class, e.g. warrior, mage, or thief."),
      description: z.string(),
    }),
  );

  return streamObject({
    model: openai("gpt-4o-mini-2024-07-18"),
    output: "array",
    schema,
    prompt,
  });
}
