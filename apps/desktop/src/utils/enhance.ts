import { useCallback, useRef, useState } from "react";

import { useHypr } from "@/contexts";

import type { EnhanceRequest } from "@/types/server";

export function useEnhance(input: EnhanceRequest) {
  const { client } = useHypr();
  const [data, setData] = useState<string>(input.editor);
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
      setData(input.editor);
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

        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(5);
            buffer += data;
          }
        }

        setData(buffer);
        console.log("buffer", buffer);
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
