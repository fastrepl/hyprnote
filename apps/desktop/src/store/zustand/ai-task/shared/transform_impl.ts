import type { TextStreamPart, ToolSet } from "ai";
import type { StreamTransform } from "./transform_infra";

export function addMarkdownSectionSeparators<TOOLS extends ToolSet = ToolSet>(): StreamTransform<TOOLS> {
  return () => {
    let fullText = "";
    let textStartChunk: TextStreamPart<TOOLS> | null = null;
    let hasEmittedStart = false;
    let hasEmittedText = false;

    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(chunk, controller) {
        if (
          chunk.type === "tool-call"
          || chunk.type === "tool-result"
          || chunk.type === "tool-error"
          || chunk.type === "tool-input-start"
          || chunk.type === "tool-input-delta"
          || chunk.type === "tool-input-end"
          || chunk.type === "start-step"
          || chunk.type === "finish-step"
        ) {
          controller.enqueue(chunk);
          return;
        }

        if (chunk.type === "text-start") {
          textStartChunk = chunk;
          return;
        }

        if (chunk.type === "text-delta") {
          fullText += chunk.text;
          return;
        }

        if (chunk.type === "text-end") {
          if (textStartChunk && !hasEmittedStart) {
            controller.enqueue(textStartChunk);
            hasEmittedStart = true;
          }

          if (fullText && !hasEmittedText) {
            const transformed = fullText.replace(/\n\n(#+\s)/g, "\n\n<p></p>\n\n$1");
            controller.enqueue({
              type: "text-delta",
              text: transformed,
              id: (chunk as any).id,
            });
            hasEmittedText = true;
          }

          controller.enqueue(chunk);
          return;
        }

        controller.enqueue(chunk);
      },

      flush(controller) {
        if (textStartChunk && !hasEmittedStart) {
          controller.enqueue(textStartChunk);
        }

        if (fullText && !hasEmittedText) {
          const transformed = fullText.replace(/\n\n(#+\s)/g, "\n\n<p></p>\n\n$1");
          controller.enqueue({
            type: "text-delta",
            text: transformed,
            id: "final",
          });
        }
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
        if (
          chunk.type === "tool-call"
          || chunk.type === "tool-result"
          || chunk.type === "tool-error"
          || chunk.type === "tool-input-start"
          || chunk.type === "tool-input-delta"
          || chunk.type === "tool-input-end"
          || chunk.type === "start-step"
          || chunk.type === "finish-step"
        ) {
          controller.enqueue(chunk);
          return;
        }

        if (!hasFoundMarker) {
          if (chunk.type === "text-delta") {
            fullText += chunk.text;
          }

          bufferedChunks.push(chunk);

          if (chunk.type === "text-delta") {
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
                } else {
                  controller.enqueue(buffered);
                }
              }

              bufferedChunks = [];
            }
          }
        } else {
          controller.enqueue(chunk);
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
