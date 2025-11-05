import { generateText, type LanguageModel, smoothStream, streamText } from "ai";

import { trimBeforeMarker } from "../shared/transform_impl";
import { type EarlyValidatorFn, withEarlyValidationRetry } from "../shared/validate";
import type { EnrichedTaskArgsMap, TaskConfig } from ".";

export const enhanceWorkflow: Pick<TaskConfig<"enhance">, "executeWorkflow" | "transforms"> = {
  executeWorkflow,
  transforms: [trimBeforeMarker("#"), smoothStream({ delayInMs: 350, chunking: "line" })],
};

async function* executeWorkflow(params: {
  model: LanguageModel;
  args: EnrichedTaskArgsMap["enhance"];
  system: string;
  prompt: string;
  onProgress: (step: any) => void;
  signal: AbortSignal;
}) {
  const { model, args, system, prompt, onProgress, signal } = params;

  if (!args.template) {
    onProgress({ type: "analyzing" });

    await generateText({
      model,
      prompt: `Analyze this meeting content and suggest appropriate section headings for a comprehensive summary. 
The sections should cover the main themes and topics discussed.
Generate around 5-7 sections based on the content depth.
Give me in bullet points.

Content: ${prompt}`,
      abortSignal: signal,
    });
  }

  onProgress({ type: "generating" });

  const validator = createValidator(args.template);

  if (args.template) {
    yield* withEarlyValidationRetry(
      (retrySignal, { previousFeedback }) => {
        let enhancedPrompt = prompt;

        if (previousFeedback) {
          enhancedPrompt = `${prompt}

IMPORTANT: Previous attempt failed. ${previousFeedback}`;
        }

        const result = streamText({
          model,
          system,
          prompt: enhancedPrompt,
          abortSignal: retrySignal,
        });
        return result.fullStream;
      },
      validator,
      {
        minChar: 10,
        maxChar: 30,
        maxRetries: 2,
        onRetry: (attempt, feedback) => {
          console.log(`[Enhance] Retry ${attempt}: ${feedback}`);
        },
      },
    );
  } else {
    yield* withEarlyValidationRetry(
      (retrySignal, { previousFeedback }) => {
        let enhancedPrompt = prompt;

        if (previousFeedback) {
          enhancedPrompt = `${prompt}

IMPORTANT: Previous attempt failed. ${previousFeedback}`;
        }

        const result = streamText({
          model,
          system,
          prompt: enhancedPrompt,
          abortSignal: retrySignal,
        });
        return result.fullStream;
      },
      validator,
      {
        minChar: 10,
        maxChar: 30,
        maxRetries: 2,
        onRetry: (attempt, feedback) => {
          console.log(`[Enhance] Retry ${attempt}: ${feedback}`);
        },
      },
    );
  }
}

function createValidator(
  template?: EnrichedTaskArgsMap["enhance"]["template"],
): EarlyValidatorFn {
  return (textSoFar: string) => {
    const normalized = textSoFar.trim();

    if (!template) {
      if (!normalized.startsWith("# ")) {
        return {
          valid: false,
          feedback: "Output must start with a markdown h1 heading (# Title).",
        };
      }
      return { valid: true };
    }

    const firstSection = template.sections[0];
    if (!firstSection) {
      if (!normalized.startsWith("# ")) {
        return {
          valid: false,
          feedback: "Output must start with a markdown h1 heading (# Title).",
        };
      }
      return { valid: true };
    }

    const expectedStart = `# ${firstSection.title}`;
    if (!normalized.startsWith(expectedStart)) {
      return {
        valid: false,
        feedback: `Output must start with the first template section heading: "${expectedStart}"`,
      };
    }

    return { valid: true };
  };
}
