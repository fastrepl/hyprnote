import { env } from "../env";
import type {
  BatchAlternatives,
  BatchChannel,
  BatchParams,
  BatchResponse,
  BatchResults,
  BatchWord,
} from "./batch-types";

const ASSEMBLYAI_API_URL = "https://api.assemblyai.com/v2";
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 200;

type AssemblyAIWord = {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: string;
};

type AssemblyAITranscriptResponse = {
  id: string;
  status: string;
  text?: string;
  words?: AssemblyAIWord[];
  confidence?: number;
  audio_duration?: number;
  error?: string;
};

const uploadAudio = async (audioData: ArrayBuffer): Promise<string> => {
  const response = await fetch(`${ASSEMBLYAI_API_URL}/upload`, {
    method: "POST",
    headers: {
      Authorization: env.ASSEMBLYAI_API_KEY,
      "Content-Type": "application/octet-stream",
    },
    body: audioData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `AssemblyAI upload failed: ${response.status} - ${errorText}`,
    );
  }

  const result = (await response.json()) as { upload_url: string };
  return result.upload_url;
};

const createTranscript = async (
  audioUrl: string,
  params: BatchParams,
): Promise<string> => {
  const languageCode =
    params.languages && params.languages.length === 1
      ? params.languages[0]
      : undefined;
  const languageDetection =
    !params.languages ||
    params.languages.length === 0 ||
    params.languages.length > 1;

  const requestBody: Record<string, unknown> = {
    audio_url: audioUrl,
    speaker_labels: true,
  };

  if (languageCode) {
    requestBody.language_code = languageCode;
  }
  if (languageDetection) {
    requestBody.language_detection = true;
  }
  if (params.keywords && params.keywords.length > 0) {
    requestBody.keyterms_prompt = params.keywords;
  }
  if (params.model) {
    requestBody.speech_model = params.model;
  }

  const response = await fetch(`${ASSEMBLYAI_API_URL}/transcript`, {
    method: "POST",
    headers: {
      Authorization: env.ASSEMBLYAI_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `AssemblyAI transcript creation failed: ${response.status} - ${errorText}`,
    );
  }

  const result = (await response.json()) as { id: string };
  return result.id;
};

const pollTranscript = async (
  transcriptId: string,
): Promise<AssemblyAITranscriptResponse> => {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await fetch(
      `${ASSEMBLYAI_API_URL}/transcript/${transcriptId}`,
      {
        headers: {
          Authorization: env.ASSEMBLYAI_API_KEY,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `AssemblyAI poll failed: ${response.status} - ${errorText}`,
      );
    }

    const result = (await response.json()) as AssemblyAITranscriptResponse;

    if (result.status === "completed") {
      return result;
    }

    if (result.status === "error") {
      throw new Error(
        `AssemblyAI transcription failed: ${result.error ?? "unknown error"}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("AssemblyAI transcription timed out");
};

const convertToResponse = (
  result: AssemblyAITranscriptResponse,
): BatchResponse => {
  const words: BatchWord[] = (result.words ?? []).map((w) => {
    const speaker = w.speaker
      ? parseInt(w.speaker.replace(/\D/g, ""), 10)
      : undefined;

    return {
      word: w.text,
      start: w.start / 1000,
      end: w.end / 1000,
      confidence: w.confidence,
      speaker: Number.isNaN(speaker) ? undefined : speaker,
      punctuated_word: w.text,
    };
  });

  const alternatives: BatchAlternatives = {
    transcript: result.text ?? "",
    confidence: result.confidence ?? 1.0,
    words,
  };

  const channel: BatchChannel = {
    alternatives: [alternatives],
  };

  const results: BatchResults = {
    channels: [channel],
  };

  return {
    metadata: {
      audio_duration: result.audio_duration,
    },
    results,
  };
};

export const transcribeWithAssemblyAI = async (
  audioData: ArrayBuffer,
  _contentType: string,
  params: BatchParams,
): Promise<BatchResponse> => {
  const uploadUrl = await uploadAudio(audioData);
  const transcriptId = await createTranscript(uploadUrl, params);
  const result = await pollTranscript(transcriptId);
  return convertToResponse(result);
};
