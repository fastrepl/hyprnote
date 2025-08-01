import { createOpenAI } from "@ai-sdk/openai";
import { createServerFn } from "@tanstack/react-start";
import { generateText as generateTextFn } from "ai";
import { z } from "zod";

export const generateText = createServerFn({ method: "POST" })
  .validator(z.object({ model: z.string(), baseUrl: z.string(), apiKey: z.string(), prompt: z.string() }))
  .handler(
    async ({ data }) => {
      const openai = createOpenAI({
        baseURL: data.baseUrl,
        apiKey: data.apiKey,
      });

      const result = await generateTextFn({
        model: openai(data.model),
        messages: [{ role: "user", content: data.prompt }],
      });

      return result.text;
    },
  );
