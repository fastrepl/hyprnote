import type {
  ChatGenerationParams,
  ChatResponse,
} from "@openrouter/sdk/models";

export { ChatGenerationParams, ChatResponse };

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function callOpenRouter(
  apiKey: string,
  request: ChatGenerationParams,
): Promise<ChatResponse> {
  const toolChoice = request.toolChoice;
  const needsToolCalling =
    Array.isArray(request.tools) &&
    request.tools.length > 0 &&
    !(typeof toolChoice === "string" && toolChoice === "none");

  const modelsToUse = needsToolCalling
    ? [
        "moonshotai/kimi-k2-0905:exacto",
        "anthropic/claude-haiku-4.5",
        "openai/gpt-oss-120b:exacto",
      ]
    : ["moonshotai/kimi-k2-0905", "openai/gpt-5.1-chat"];

  const response = await fetch(OPENROUTER_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      ...request,
      models: modelsToUse,
      provider: { sort: "latency" },
      messages: request.messages,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${body}`);
  }

  return response.json() as Promise<ChatResponse>;
}
