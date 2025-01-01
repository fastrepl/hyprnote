import { JSONValue, parsePartialJson } from "@ai-sdk/ui-utils";
import { JSONContent } from "@tiptap/react";
import { useRef } from "react";

interface EnhanceRequest {
  baseURL: string;
  apiKey: string;
  editor: JSONContent;
}

export function useEnhance(input: EnhanceRequest) {
  const abortControllerRef = useRef<AbortController | null>(null);

  const submit = async () => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const response = await fetch(`${input.baseURL}/enhance`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input.editor),
      signal: abortController.signal,
    });

    let total = "";
    let parsed: JSONValue = [];

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) {
        break;
      }

      const decodedValue = decoder.decode(chunk);

      total += decodedValue;
      const { value, state } = parsePartialJson(total);

      if (state === "successful-parse" && value) {
        parsed = value;
      }
    }
  };

  return {
    submit,
  };
}
