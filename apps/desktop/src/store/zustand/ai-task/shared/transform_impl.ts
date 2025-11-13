import type { TextStreamPart, ToolSet } from "ai";

import type { StreamTransform } from "./transform_infra";

function isNonTextChunk<TOOLS extends ToolSet>(
  chunk: TextStreamPart<TOOLS>,
): boolean {
  return (
    chunk.type === "tool-call" ||
    chunk.type === "tool-result" ||
    chunk.type === "tool-error" ||
    chunk.type === "tool-input-start" ||
    chunk.type === "tool-input-delta" ||
    chunk.type === "tool-input-end" ||
    chunk.type === "start-step" ||
    chunk.type === "finish-step"
  );
}

export function addMarkdownSectionSeparators<
  TOOLS extends ToolSet = ToolSet,
>(): StreamTransform<TOOLS> {
  return () => {
    let consecutiveNewlines = 0;

    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(chunk, controller) {
        if (chunk.type !== "text-delta") {
          controller.enqueue(chunk);
          return;
        }

        let transformedText = "";

        for (const char of chunk.text) {
          if (char === "\n") {
            consecutiveNewlines += 1;
            transformedText += char;
            continue;
          }

          if (char === "#" && consecutiveNewlines >= 2) {
            transformedText += "<p></p>\n\n";
          }

          consecutiveNewlines = 0;
          transformedText += char;
        }

        controller.enqueue({
          ...chunk,
          text: transformedText,
        });
      },
    });
  };
}

export function trimBeforeMarker<TOOLS extends ToolSet = ToolSet>(
  marker: string,
): StreamTransform<TOOLS> {
  return () => {
    let fullText = "";
    let hasFoundMarker = false;
    let bufferedChunks: TextStreamPart<TOOLS>[] = [];

    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(chunk, controller) {
        if (isNonTextChunk(chunk)) {
          controller.enqueue(chunk);
          return;
        }

        if (hasFoundMarker) {
          controller.enqueue(chunk);
          return;
        }

        bufferedChunks.push(chunk);

        if (chunk.type === "text-delta") {
          fullText += chunk.text;
          const markerIndex = fullText.indexOf(marker);

          if (markerIndex !== -1) {
            hasFoundMarker = true;
            const trimmedText = fullText.substring(markerIndex);

            for (const buffered of bufferedChunks) {
              if (buffered.type === "text-delta") {
                controller.enqueue({
                  ...buffered,
                  text: trimmedText,
                });
                break;
              }
              controller.enqueue(buffered);
            }

            bufferedChunks = [];
          }
        }
      },

      flush(controller) {
        if (!hasFoundMarker) {
          for (const chunk of bufferedChunks) {
            controller.enqueue(chunk);
          }
        }
      },
    });
  };
}
