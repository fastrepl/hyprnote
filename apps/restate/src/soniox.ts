import { z } from "zod";

const SONIOX_API_HOST = "https://api.soniox.com";

export class SonioxError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly isRetryable: boolean,
  ) {
    super(message);
    this.name = "SonioxError";
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export const SonioxCallback = z.object({
  id: z.string(),
  status: z.enum(["completed", "error"]),
});

export type SonioxCallbackType = z.infer<typeof SonioxCallback>;

export type SonioxToken = {
  text: string;
  start_ms?: number;
  end_ms?: number;
  confidence?: number;
  speaker?: number | string;
};

export type SonioxTranscriptResponse = {
  text: string;
  tokens: SonioxToken[];
};

export async function transcribeWithCallback(
  audioUrl: string,
  callbackUrl: string,
  apiKey: string,
): Promise<string> {
  const response = await fetch(`${SONIOX_API_HOST}/v1/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "stt-async-v3",
      audio_url: audioUrl,
      webhook_url: callbackUrl,
      enable_speaker_diarization: true,
      enable_language_identification: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new SonioxError(
      `Soniox: ${response.status} - ${errorText}`,
      response.status,
      isRetryableStatus(response.status),
    );
  }

  const result = (await response.json()) as { id: string };
  if (!result.id) {
    throw new Error("Soniox: missing transcription id");
  }

  return result.id;
}

export async function fetchTranscript(
  transcriptionId: string,
  apiKey: string,
): Promise<SonioxTranscriptResponse> {
  const response = await fetch(
    `${SONIOX_API_HOST}/v1/transcriptions/${transcriptionId}/transcript`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Soniox fetch transcript: ${response.status} - ${errorText}`,
    );
  }

  const result = (await response.json()) as SonioxTranscriptResponse;
  return result;
}

export function extractSonioxTranscriptText(
  response: SonioxTranscriptResponse,
): string {
  return response.text || renderTokens(response.tokens);
}

function renderTokens(tokens: SonioxToken[]): string {
  return tokens.map((token) => token.text).join("");
}
