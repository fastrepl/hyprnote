import {
  generateObject,
  type LanguageModel,
  smoothStream,
  streamText,
} from "ai";
import { detect } from "tinyld";
import { z } from "zod";

import { commands as templateCommands } from "@hypr/plugin-template";
import {
  type Template,
  type TemplateSection,
  templateSectionSchema,
} from "@hypr/store";

import type { TaskArgsMapTransformed, TaskConfig } from ".";
import type { Store } from "../../../tinybase/main";
import { getCustomPrompt } from "../../../tinybase/prompts";
import {
  addMarkdownSectionSeparators,
  trimBeforeMarker,
} from "../shared/transform_impl";
import {
  type EarlyValidatorFn,
  withEarlyValidationRetry,
} from "../shared/validate";

const MIN_CHARS_FOR_LANGUAGE_VALIDATION = 128;

export const enhanceWorkflow: Pick<
  TaskConfig<"enhance">,
  "executeWorkflow" | "transforms"
> = {
  executeWorkflow,
  transforms: [
    trimBeforeMarker("#"),
    addMarkdownSectionSeparators(),
    smoothStream({ delayInMs: 250, chunking: "line" }),
  ],
};

async function* executeWorkflow(params: {
  model: LanguageModel;
  args: TaskArgsMapTransformed["enhance"];
  onProgress: (step: any) => void;
  signal: AbortSignal;
  store: Store;
}) {
  const { model, args, onProgress, signal, store } = params;

  const sections = await generateTemplateIfNeeded({
    model,
    args,
    onProgress,
    signal,
    store,
  });
  const argsWithTemplate = {
    ...args,
    template: sections ? { sections } : undefined,
  };

  const system = await getSystemPrompt(argsWithTemplate);
  const prompt = await getUserPrompt(argsWithTemplate, store);

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
    language: args.language,
  });

  if (result.status === "error") {
    throw new Error(result.error);
  }

  return result.data;
}

async function getUserPrompt(
  args: TaskArgsMapTransformed["enhance"],
  store: Store,
) {
  const { rawMd, sessionData, participants, template, segments } = args;

  const ctx = {
    content: rawMd,
    session: sessionData,
    participants,
    template,
    segments,
  };

  const customPrompt = getCustomPrompt(store, "enhance");
  if (customPrompt) {
    const result = await templateCommands.renderCustom(customPrompt, ctx);
    if (result.status === "error") {
      throw new Error(result.error);
    }
    return result.data;
  }

  const result = await templateCommands.render("enhance.user", ctx);

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
  store: Store;
}): Promise<Array<TemplateSection> | undefined> {
  const { model, args, onProgress, signal, store } = params;

  if (!args.template) {
    onProgress({ type: "analyzing" });

    const schema = z.object({ sections: z.array(templateSectionSchema) });
    const userPrompt = await getUserPrompt(args, store);

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
    } catch {
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

  const validator = createValidator(args.template, args.language);

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
      minChar: MIN_CHARS_FOR_LANGUAGE_VALIDATION,
      maxChar: 256,
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

function stripMarkdownForDetection(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function createValidator(
  template: Pick<Template, "sections"> | undefined,
  expectedLanguage: string,
): EarlyValidatorFn {
  return (textSoFar: string) => {
    const normalized = textSoFar.trim();

    if (!template?.sections || template.sections.length === 0) {
      if (!normalized.startsWith("# ")) {
        const feedback =
          "Output must start with a markdown h1 heading (# Title).";
        return { valid: false, feedback };
      }
    } else {
      const firstSection = template.sections[0];
      const expectedStart = `# ${firstSection.title}`;
      const isValid =
        expectedStart.startsWith(normalized) ||
        normalized.startsWith(expectedStart);
      if (!isValid) {
        const feedback = `Output must start with the first template section heading: "${expectedStart}"`;
        return { valid: false, feedback };
      }
    }

    const strippedText = stripMarkdownForDetection(normalized);
    if (strippedText.length >= MIN_CHARS_FOR_LANGUAGE_VALIDATION) {
      const detectedLanguage = detect(strippedText);
      if (detectedLanguage && detectedLanguage !== expectedLanguage) {
        const feedback = `Output must be in ${expectedLanguage} language, but detected ${detectedLanguage}. Please regenerate in the correct language.`;
        return { valid: false, feedback };
      }
    }

    return { valid: true };
  };
}
