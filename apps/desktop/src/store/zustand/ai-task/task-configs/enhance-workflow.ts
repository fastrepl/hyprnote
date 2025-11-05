import { generateText, type LanguageModel, smoothStream, streamText } from "ai";

import { trimBeforeMarker } from "../shared/transform_impl";
import type { TaskArgsMap, TaskConfig } from ".";

export const enhanceWorkflow: Pick<TaskConfig<"enhance">, "executeWorkflow" | "transforms"> = {
  executeWorkflow,
  transforms: [trimBeforeMarker("#"), smoothStream({ delayInMs: 350, chunking: "line" })],
};

async function* executeWorkflow(params: {
  model: LanguageModel;
  args: TaskArgsMap["enhance"];
  system: string;
  prompt: string;
  onProgress: (step: any) => void;
  signal: AbortSignal;
}) {
  const { model, args, system, prompt, onProgress, signal } = params;

  if (!args.templateId) {
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

  const result = streamText({
    model,
    system,
    prompt,
    abortSignal: signal,
  });

  yield* result.fullStream;
}
