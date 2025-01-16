import { useCallback, useRef, useState } from "react";
import { parsePartialJson } from "@ai-sdk/ui-utils";
import type { JSONContent } from "@tiptap/react";

import { useHypr } from "@/contexts";
import { validateSchema } from "@/components/editor/utils";

import type { EnhanceRequest } from "@/types/server";

export function useEnhance(input: EnhanceRequest) {
  const { client } = useHypr();
  const [data, setData] = useState<JSONContent>(input.editor as JSONContent);
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
    try {
      setIsLoading(true);
      setData(input.editor as JSONContent);
      setError(undefined);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const stream = client.enhance(input);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value);

        try {
          const { error } = JSON.parse(chunk);
          setError(error);
          break;
        } catch (_ignored) {}

        const lines = chunk
          .split("data: ")
          .filter(Boolean)
          .filter((line) => line !== "[DONE]");

        const delta = lines
          .map((line) => {
            try {
              return JSON.parse(line)?.choices[0]?.delta?.content;
            } catch (error) {
              return null;
            }
          })
          .filter(Boolean)
          .join("");

        buffer += delta;

        const parsed = parsePartialJson(buffer);

        if (
          parsed.state === "failed-parse" ||
          parsed.state === "undefined-input" ||
          !parsed.value
        ) {
          continue;
        }

        if (validateSchema(parsed.value as JSONContent)) {
          setData(parsed.value as JSONContent);
        }
      }
    } catch (error) {
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    stop,
    submit,
    data,
    isLoading,
    error,
  };
}
