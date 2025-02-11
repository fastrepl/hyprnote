import { useCallback, useRef, useState } from "react";

import type { EnhanceRequest } from "@/types";
import { enhance } from "@/client";

type EnhanceStatus = "idle" | "loading" | "error" | "success";

export function useEnhance(input: EnhanceRequest) {
  const [data, setData] = useState<string>("");
  const [status, setStatus] = useState<EnhanceStatus>("idle");
  const [error, setError] = useState<undefined | Error>(undefined);

  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    try {
      abortControllerRef.current?.abort();
    } catch (ignored) {
    } finally {
      setStatus("idle");
      abortControllerRef.current = null;
    }
  }, []);

  const submit = async () => {
    try {
      setData("");
      setStatus("loading");
      setError(undefined);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const stream = enhance(input);
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value);

        let buffer = "";
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(5);
            buffer += data;
          }
        }

        setData(buffer);
      }

      setStatus("success");
    } catch (error) {
      setStatus("error");
      setError(error as Error);
    }
  };

  return {
    stop,
    submit,
    data,
    status,
    error,
  };
}
