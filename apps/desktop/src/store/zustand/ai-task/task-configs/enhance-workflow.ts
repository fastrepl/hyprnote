import { generateObject, type LanguageModel, smoothStream, streamText } from "ai";
import { z } from "zod";

import { templateSchema } from "@hypr/db";
import { type Template } from "../../../tinybase/schema-external";
import { trimBeforeMarker } from "../shared/transform_impl";
import { type EarlyValidatorFn, withEarlyValidationRetry } from "../shared/validate";
import type { TaskArgsMapTransformed, TaskConfig } from ".";

export const enhanceWorkflow: Pick<TaskConfig<"enhance">, "executeWorkflow" | "transforms"> = {
  executeWorkflow,
  transforms: [trimBeforeMarker("#"), smoothStream({ delayInMs: 350, chunking: "line" })],
};

async function* executeWorkflow(params: {
  model: LanguageModel;
  args: TaskArgsMapTransformed["enhance"];
  system: string;
  prompt: string;
  onProgress: (step: any) => void;
  signal: AbortSignal;
}) {
  const { model, args, system, prompt, onProgress, signal } = params;

  const template = await generateTemplateIfNeeded({ model, args, prompt, onProgress, signal });
  yield* generateSummary({ model, args: { ...args, template }, system, prompt, onProgress, signal });
}

async function generateTemplateIfNeeded(params: {
  model: LanguageModel;
  args: TaskArgsMapTransformed["enhance"];
  prompt: string;
  onProgress: (step: any) => void;
  signal: AbortSignal;
}): Promise<Omit<Template, "user_id" | "created_at"> | undefined> {
  const { model, args, prompt, onProgress, signal } = params;

  if (!args.template) {
    onProgress({ type: "analyzing" });
    const schema = templateSchema.omit({ id: true, user_id: true, created_at: true });

    try {
      const template = await generateObject({
        model,
        mode: "json",
        schema,
        abortSignal: signal,
        prompt: `Analyze this meeting content and suggest appropriate section headings for a comprehensive summary. 
  The sections should cover the main themes and topics discussed.
  Generate around 5-7 sections based on the content depth.
  Give me in bullet points.
  
  Content: 
  ---
  ${prompt}
  ---
  
  Follow this JSON schema for your response.
  ---
  ${JSON.stringify(z.toJSONSchema(schema))}
  ---
  
  IMPORTANT: Start with {, NO \`\`\`json. (I will directly parse it with JSON.parse())`,
      });

      return template.object as Omit<Template, "user_id" | "created_at">;
    } catch (error) {
      console.error(JSON.stringify(error, null, 2));
      return undefined;
    }
  } else {
    return args.template;
  }
}

async function* generateSummary(params: {
  model: LanguageModel;
  args: TaskArgsMapTransformed["enhance"];
  system: string;
  prompt: string;
  onProgress: (step: any) => void;
  signal: AbortSignal;
}) {
  const { model, args, system, prompt, onProgress } = params;

  onProgress({ type: "generating" });

  const validator = createValidator(args.template);

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

function createValidator(template?: Omit<Template, "user_id" | "created_at">): EarlyValidatorFn {
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
