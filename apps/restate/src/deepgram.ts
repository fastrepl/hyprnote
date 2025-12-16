import { CallbackUrl, createClient } from "@deepgram/sdk";
import { z } from "zod";

const NON_RETRYABLE_ERROR_CODES = new Set([
  "REMOTE_CONTENT_ERROR",
  "INVALID_AUTH",
  "INSUFFICIENT_PERMISSIONS",
  "PROJECT_NOT_FOUND",
  "ASR_PAYMENT_REQUIRED",
  "INVALID_QUERY_PARAMETER",
  "PAYLOAD_ERROR",
  "PAYLOAD_TOO_LARGE",
  "Payload Too Large",
  "UNSUPPORTED_MEDIA_TYPE",
  "UNPROCESSABLE_ENTITY",
  "Bad Request",
]);

export class DeepgramError extends Error {
  constructor(
    message: string,
    public readonly code: string | undefined,
    public readonly isRetryable: boolean,
  ) {
    super(message);
    this.name = "DeepgramError";
  }
}

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

  if (error) {
    let code: string | undefined;
    try {
      const parsed = JSON.parse(error.message);
      code = parsed.err_code;
    } catch {}
    const isRetryable = code ? !NON_RETRYABLE_ERROR_CODES.has(code) : true;
    throw new DeepgramError(`Deepgram: ${error.message}`, code, isRetryable);
  }
  if (!result?.request_id) throw new Error("Deepgram: missing request_id");

  return result.request_id;
}
