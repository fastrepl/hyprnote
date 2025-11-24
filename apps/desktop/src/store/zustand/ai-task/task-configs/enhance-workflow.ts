import {
  generateObject,
  type LanguageModel,
  smoothStream,
  streamText,
} from "ai";
import { z } from "zod";

import { commands as templateCommands } from "@hypr/plugin-template";

import type { TaskArgsMapTransformed, TaskConfig } from ".";
import {
  type Template,
  TemplateSection,
  templateSectionSchema,
} from "../../../tinybase/schema-external";
import {
  addMarkdownSectionSeparators,
  trimBeforeMarker,
} from "../shared/transform_impl";
import {
  type EarlyValidatorFn,
  withEarlyValidationRetry,
} from "../shared/validate";

export const enhanceWorkflow: Pick<
  TaskConfig<"enhance">,
  "executeWorkflow" | "transforms"
> = {
  executeWorkflow,
  transforms: [
    trimBeforeMarker("#"),
    addMarkdownSectionSeparators(),
    smoothStream({ delayInMs: 350, chunking: "line" }),
  ],
};

async function* executeWorkflow(params: {
  model: LanguageModel;
  args: TaskArgsMapTransformed["enhance"];
  onProgress: (step: any) => void;
  signal: AbortSignal;
}) {
  const { model, args, onProgress, signal } = params;

  const sections = await generateTemplateIfNeeded({
    model,
    args,
    onProgress,
    signal,
  });
  const argsWithTemplate = {
    ...args,
    template: sections ? { sections } : undefined,
  };

  const system = await getSystemPrompt(argsWithTemplate);
  const prompt = await getUserPrompt(argsWithTemplate);

  yield* generateSummary({
    model,
    args: argsWithTemplate,
    system,
    prompt,
    onProgress,
    signal,
  });
}

async function getSystemPrompt(args: TaskArgsMapTransformed["enhance"]) {
  const result = await templateCommands.render("enhance.system", {
    hasTemplate: !!args.template,
  });

  if (result.status === "error") {
    throw new Error(result.error);
  }

  return result.data;
}

async function getUserPrompt(args: TaskArgsMapTransformed["enhance"]) {
  const { rawMd, sessionData, participants, template, segments, noteHistory } =
    args;

  const result = await templateCommands.render("enhance.user", {
    content: rawMd,
    session: sessionData,
    participants,
    template,
    segments,
    note_history: noteHistory,
  });

  if (result.status === "error") {
    throw new Error(result.error);
  }

  return result.data;
}

async function generateTemplateIfNeeded(params: {
  model: LanguageModel;
  args: TaskArgsMapTransformed["enhance"];
  onProgress: (step: any) => void;
  signal: AbortSignal;
}): Promise<Array<TemplateSection> | undefined> {
  const { model, args, onProgress, signal } = params;

  if (!args.template) {
    onProgress({ type: "analyzing" });

    const schema = z.object({ sections: z.array(templateSectionSchema) });
    const userPrompt = await getUserPrompt(args);

    try {
      const template = await generateObject({
        model,
        temperature: 0,
        schema,
        abortSignal: signal,
        prompt: `Analyze this meeting content and suggest appropriate section headings for a comprehensive summary. 
  The sections should cover the main themes and topics discussed.
  Generate around 5-7 sections based on the content depth.
  Give me in bullet points.
  
  Content: 
  ---
  ${userPrompt}
  ---
  
  Follow this JSON schema for your response. No additional properties.
  ---
  ${JSON.stringify(z.toJSONSchema(schema))}
  ---
  
  IMPORTANT: Start with '{', NO \`\`\`json. (I will directly parse it with JSON.parse())`,
      });

      return template.object.sections as Array<TemplateSection>;
    } catch (error) {
      return undefined;
    }
  } else {
    return args.template.sections;
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
  const { model, args, system, prompt, onProgress, signal } = params;

  onProgress({ type: "generating" });

  const validator = createValidator(args.template);

  yield* withEarlyValidationRetry(
    (retrySignal, { previousFeedback }) => {
      let enhancedPrompt = prompt;

      if (previousFeedback) {
        enhancedPrompt = `${prompt}

IMPORTANT: Previous attempt failed. ${previousFeedback}`;
      }

      const combinedController = new AbortController();

      const abortFromOuter = () => combinedController.abort();
      const abortFromRetry = () => combinedController.abort();

      signal.addEventListener("abort", abortFromOuter);
      retrySignal.addEventListener("abort", abortFromRetry);

      try {
        const result = streamText({
          model,
          system,
          prompt: enhancedPrompt,
          abortSignal: combinedController.signal,
        });
        return result.fullStream;
      } finally {
        signal.removeEventListener("abort", abortFromOuter);
        retrySignal.removeEventListener("abort", abortFromRetry);
      }
    },
    validator,
    {
      minChar: 10,
      maxChar: 30,
      maxRetries: 2,
      onRetry: (attempt, feedback) => {
        onProgress({ type: "retrying", attempt, reason: feedback });
      },
      onRetrySuccess: () => {
        onProgress({ type: "generating" });
      },
    },
  );
}

function createValidator(
  template?: Pick<Template, "sections">,
): EarlyValidatorFn {
  return (textSoFar: string) => {
    const normalized = textSoFar.trim();

    if (!template?.sections || template.sections.length === 0) {
      if (!normalized.startsWith("# ")) {
        const feedback =
          "Output must start with a markdown h1 heading (# Title).";
        return { valid: false, feedback };
      }

      return { valid: true };
    }

    const firstSection = template.sections[0];
    const expectedStart = `# ${firstSection.title}`;
    const isValid =
      expectedStart.startsWith(normalized) ||
      normalized.startsWith(expectedStart);
    if (!isValid) {
      const feedback = `Output must start with the first template section heading: "${expectedStart}"`;
      return { valid: false, feedback };
    }

    return { valid: true };
  };
}
