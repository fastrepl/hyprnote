import { OpenAI as PostHogOpenAI } from "@posthog/ai";

import { env } from "../env";
import { posthog } from "./posthog";

export const openai = new PostHogOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: env.OPENROUTER_API_KEY,
  posthog,
});

const MODELS = {
  toolCalling: [
    "moonshotai/kimi-k2-0905:exacto",
    "anthropic/claude-haiku-4.5",
    "openai/gpt-oss-120b:exacto",
  ],
  default: ["moonshotai/kimi-k2-0905", "openai/gpt-5.1-chat"],
} as const;

export function getModels(needsToolCalling: boolean): string[] {
  return needsToolCalling ? [...MODELS.toolCalling] : [...MODELS.default];
}
