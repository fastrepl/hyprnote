import type { TextStreamPart, ToolSet } from "ai";

export type EarlyValidatorFn = (textSoFar: string) => { valid: true } | { valid: false; feedback: string };

export async function* withEarlyValidationRetry<TOOLS extends ToolSet = ToolSet>(
  executeStream: (
    signal: AbortSignal,
    attemptContext: { attempt: number; previousFeedback?: string },
  ) => AsyncIterable<TextStreamPart<TOOLS>>,
  validator: EarlyValidatorFn,
  options: {
    minChar?: number;
    maxChar?: number;
    maxRetries?: number;
    onRetry?: (attempt: number, feedback: string) => void;
  } = {},
): AsyncIterable<TextStreamPart<TOOLS>> {
  const { minChar = 5, maxChar = 30, maxRetries = 2, onRetry } = options;

  let previousFeedback: string | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const abortController = new AbortController();
    const buffer: TextStreamPart<TOOLS>[] = [];
    let accumulatedText = "";
    let validationComplete = false;
    let shouldRetry = false;

    try {
      const stream = executeStream(abortController.signal, { attempt, previousFeedback });

      for await (const chunk of stream) {
        if (!validationComplete) {
          buffer.push(chunk);

          if (chunk.type === "text-delta") {
            accumulatedText += chunk.text;
            const trimmedLength = accumulatedText.trim().length;

            if (trimmedLength >= minChar) {
              const result = validator(accumulatedText);

              if (!result.valid) {
                abortController.abort();
                previousFeedback = result.feedback;
                shouldRetry = true;

                if (attempt < maxRetries - 1) {
                  onRetry?.(attempt + 1, result.feedback);
                  break;
                } else {
                  throw new Error(
                    `Validation failed after ${maxRetries} attempts: ${result.feedback}`,
                  );
                }
              }

              if (trimmedLength >= maxChar) {
                validationComplete = true;

                for (const bufferedChunk of buffer) {
                  yield bufferedChunk;
                }
                buffer.length = 0;
              }
            }
          }
        } else {
          yield chunk;
        }
      }

      if (shouldRetry) {
        continue;
      }

      if (validationComplete || buffer.length > 0) {
        for (const bufferedChunk of buffer) {
          yield bufferedChunk;
        }
        return;
      }
    } catch (error) {
      if (abortController.signal.aborted && attempt < maxRetries - 1) {
        continue;
      }
      throw error;
    }
  }
}
