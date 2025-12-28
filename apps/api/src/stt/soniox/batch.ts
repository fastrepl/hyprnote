import { env } from "../../env";
import type {
  BatchAlternatives,
  BatchChannel,
  BatchParams,
  BatchResponse,
  BatchResults,
  BatchWord,
} from "../batch-types";

const SONIOX_API_HOST = "api.soniox.com";
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 200;

type SonioxToken = {
  text: string;
  start_ms?: number;
  end_ms?: number;
  confidence?: number;
  speaker?: number | string;
};

type SonioxTranscriptResponse = {
  text: string;
  tokens: SonioxToken[];
};

type SonioxTranscriptionStatus = {
  status: string;
  error_message?: string;
};

const uploadFile = async (
  audioData: ArrayBuffer,
  fileName: string,
): Promise<string> => {
  const formData = new FormData();
  const blob = new Blob([audioData]);
  formData.append("file", blob, fileName);

  const response = await fetch(`https://${SONIOX_API_HOST}/v1/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SONIOX_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Soniox upload failed: ${response.status} - ${errorText}`);
  }

  const result = (await response.json()) as { id: string };
  return result.id;
};

const createTranscription = async (
  fileId: string,
  params: BatchParams,
): Promise<string> => {
  const model = params.model ?? "stt-async-v3";
  const languageHints = params.languages ?? [];

  const requestBody: Record<string, unknown> = {
    model: model === "stt-v3" ? "stt-async-v3" : model,
    file_id: fileId,
    enable_speaker_diarization: true,
    enable_language_identification: true,
  };

  if (languageHints.length > 0) {
    requestBody.language_hints = languageHints;
  }

  if (params.keywords && params.keywords.length > 0) {
    requestBody.context = {
      terms: params.keywords,
    };
  }

  const response = await fetch(`https://${SONIOX_API_HOST}/v1/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SONIOX_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Soniox transcription creation failed: ${response.status} - ${errorText}`,
    );
  }

  const result = (await response.json()) as { id: string };
  return result.id;
};

const pollTranscription = async (transcriptionId: string): Promise<void> => {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await fetch(
      `https://${SONIOX_API_HOST}/v1/transcriptions/${transcriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${env.SONIOX_API_KEY}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Soniox poll failed: ${response.status} - ${errorText}`);
    }

    const result = (await response.json()) as SonioxTranscriptionStatus;

    if (result.status === "completed") {
      return;
    }

    if (result.status === "error") {
      throw new Error(
        `Soniox transcription failed: ${result.error_message ?? "unknown error"}`,
      );
    }

    if (result.status !== "queued" && result.status !== "processing") {
      throw new Error(`Soniox unexpected status: ${result.status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("Soniox transcription timed out");
};

const getTranscript = async (
  transcriptionId: string,
): Promise<SonioxTranscriptResponse> => {
  const response = await fetch(
    `https://${SONIOX_API_HOST}/v1/transcriptions/${transcriptionId}/transcript`,
    {
      headers: {
        Authorization: `Bearer ${env.SONIOX_API_KEY}`,
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Soniox get transcript failed: ${response.status} - ${errorText}`,
    );
  }

  return response.json() as Promise<SonioxTranscriptResponse>;
};

const parseSpeaker = (
  speaker: number | string | undefined,
): number | undefined => {
  if (speaker === undefined) {
    return undefined;
  }
  if (typeof speaker === "number") {
    return speaker >= 0 ? speaker : undefined;
  }
  const parsed = parseInt(speaker.replace(/\D/g, ""), 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const convertToResponse = (result: SonioxTranscriptResponse): BatchResponse => {
  const words: BatchWord[] = result.tokens.map((token) => ({
    word: token.text,
    start: (token.start_ms ?? 0) / 1000,
    end: (token.end_ms ?? 0) / 1000,
    confidence: token.confidence ?? 1.0,
    speaker: parseSpeaker(token.speaker),
    punctuated_word: token.text,
  }));

  const alternatives: BatchAlternatives = {
    transcript: result.text,
    confidence: 1.0,
    words,
  };

  const channel: BatchChannel = {
    alternatives: [alternatives],
  };

  const results: BatchResults = {
    channels: [channel],
  };

  return {
    metadata: {},
    results,
  };
};

export const transcribeWithSoniox = async (
  audioData: ArrayBuffer,
  _contentType: string,
  params: BatchParams,
  fileName: string = "audio.wav",
): Promise<BatchResponse> => {
  const fileId = await uploadFile(audioData, fileName);
  const transcriptionId = await createTranscription(fileId, params);
  await pollTranscription(transcriptionId);
  const transcript = await getTranscript(transcriptionId);
  return convertToResponse(transcript);
};
