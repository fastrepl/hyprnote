import { createOpenAI } from "@ai-sdk/openai";
import { json } from "@tanstack/react-start";
import { createServerFileRoute } from "@tanstack/react-start/server";
import { generateText, streamText } from "ai";

import { userRequiredMiddlewareForRequest } from "@/services/auth.api";
import { findLlmProvider } from "@/services/llm.api";

export const ServerRoute = createServerFileRoute("/chat/completion")
  .methods((api) => ({
    POST: api.middleware([userRequiredMiddlewareForRequest]).handler(async ({ request, context }) => {
      const { model, messages, stream = false } = await request.json();
      const provider = await findLlmProvider(model);

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
          model: openai(provider.model),
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
