import { CallbackUrl, createClient } from "@deepgram/sdk";
import { z } from "zod";

export const DeepgramCallback = z.object({
  results: z
    .object({
      channels: z
        .array(
          z.object({
            alternatives: z
              .array(z.object({ transcript: z.string() }))
              .optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  channel: z
    .object({
      alternatives: z.array(z.object({ transcript: z.string() })).optional(),
    })
    .optional(),
});

export type DeepgramCallbackType = z.infer<typeof DeepgramCallback>;

export function extractTranscript(payload: DeepgramCallbackType): string {
  return (
    payload.results?.channels?.[0]?.alternatives?.[0]?.transcript ??
    payload.channel?.alternatives?.[0]?.transcript ??
    ""
  );
}

export async function transcribeWithCallback(
  audioUrl: string,
  callbackUrl: string,
  apiKey: string,
): Promise<string> {
  const client = createClient(apiKey);
  const { result, error } =
    await client.listen.prerecorded.transcribeUrlCallback(
      { url: audioUrl },
      new CallbackUrl(callbackUrl),
      { model: "nova-3", smart_format: true },
    );

  if (error) throw new Error(`Deepgram: ${error.message}`);
  if (!result?.request_id) throw new Error("Deepgram: missing request_id");

  return result.request_id;
}
