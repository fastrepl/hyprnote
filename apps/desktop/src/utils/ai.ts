import { z } from "zod";
import { useCallback, useRef, useState } from "react";
import { createOpenAI } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

import { type JSONContent } from "@tiptap/core";

const baseSchemaWithContent = z.object({
  type: z.string().optional(),
  attrs: z.record(z.any()).optional(),
  marks: z
    .array(
      z.object({
        type: z.string(),
        attrs: z.record(z.any()).optional(),
      }),
    )
    .optional(),
  text: z.string().optional(),
});

type JSONContentType = z.infer<typeof baseSchemaWithContent> & {
  content?: JSONContentType[];
};

const jsonContentSchema: z.ZodType<JSONContentType> =
  baseSchemaWithContent.extend({
    content: z.lazy(() => jsonContentSchema.array()).optional(),
  });

// @ts-ignore
const _: IsEqual<JSONContent, z.infer<typeof jsonContentSchema>> = true;
type IsEqual<Type1, Type2> = Type1 | Type2 extends Type1 & Type2 ? true : never;

// https://github.com/vercel/ai/blob/ac101a26289bfdcbc1f702ede44fe5b9393e64b9/packages/react/src/use-object.ts
export function useEnhanceNote() {
  const [data, setData] = useState<JSONContentType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<undefined | Error>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    try {
      abortControllerRef.current?.abort();
    } catch (ignored) {
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  const submit = async () => {
    setData([]);
    setError(undefined);
    setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const model = createOpenAI({
      baseURL: "https://api.openai.com/v1",
      apiKey: "",
      fetch: (
        input: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1],
      ) => {
        const withAbort = {
          ...(init ?? {}),
          signal: abortController.signal,
        };
        return tauriFetch(input, withAbort);
      },
    })("gpt-4o-mini-2024-07-18");

    const prompt = `
Generate random documents.
    `.trim();

    try {
      const result = streamObject({
        model,
        output: "array",
        schema: z.array(jsonContentSchema),
        prompt,
      });

      for await (const arr of result.elementStream) {
        setData(arr);
      }
    } catch (error) {
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    data,
    error,
    isLoading,
    stop,
    submit,
  };
}
