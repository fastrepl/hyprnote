import { createOpenAI } from "@ai-sdk/openai";
import { json } from "@tanstack/react-start";
import { createServerFileRoute } from "@tanstack/react-start/server";
import { generateText, streamText } from "ai";

import { userRequiredMiddlewareForRequest } from "@/services/auth.api";
import { findLlmProvider } from "@/services/provider.api";

// https://platform.openai.com/docs/api-reference/chat
export const ServerRoute = createServerFileRoute("/v1/chat/completions")
  .methods((api) => ({
    POST: api.middleware([userRequiredMiddlewareForRequest]).handler(async ({ request, context }) => {
      const { model: id, messages, stream = false } = await request.json();

      const idx = id.indexOf("/");
      const [name, model] = [id.slice(0, idx), id.slice(idx + 1)] as [string, string];

      const provider = await findLlmProvider({ data: { name, model } });

      if (!provider) {
        return json({ error: "no_provider" }, { status: 400 });
      }

      const openai = createOpenAI({
        baseURL: provider.baseUrl,
        apiKey: provider.apiKey,
        compatibility: "compatible",
      });

      if (!stream) {
        const result = await generateText({
          model: openai(model),
          messages,
        });

        return new Response(JSON.stringify(result.response.body as any));
      }

      return streamText({
        model: openai(model),
        messages,
      }).toDataStreamResponse();
    }),
  }));
