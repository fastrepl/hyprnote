import { useCallback, useRef, useState } from "react";
import { parsePartialJson } from "@ai-sdk/ui-utils";
import { JSONContent } from "@tiptap/react";
import { fetch } from "@tauri-apps/plugin-http";

interface EnhanceRequest {
  baseUrl: string;
  apiKey: string;
  editor: JSONContent;
}

export function useEnhance(input: EnhanceRequest) {
  const [data, setData] = useState<JSONContent[]>([]);
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
      setData([]);
      setError(undefined);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const response = await fetch(`${input.baseUrl}/api/native/enhance`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input.editor),
        signal: abortController.signal,
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) {
          break;
        }

        const lines = decoder
          .decode(chunk)
          .split("\n")
          .filter(Boolean)
          .map((line) => line.slice(6))
          .filter((line) => line !== "[DONE]");

        const delta = lines
          .map((line) => JSON.parse(line))
          .map((line) => line.choices[0].delta.content)
          .join("");

        buffer += delta;

        const { state, value } = parsePartialJson(buffer);
        if (state === "successful-parse" && value) {
          setData(value as JSONContent[]);
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
