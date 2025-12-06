import { env } from "../../env";
import type { BatchParams, BatchResponse } from "../batch-types";

const DEEPGRAM_BATCH_URL = "https://api.deepgram.com/v1/listen";

export const transcribeWithDeepgram = async (
  audioData: ArrayBuffer,
  contentType: string,
  params: BatchParams,
): Promise<BatchResponse> => {
  const url = new URL(DEEPGRAM_BATCH_URL);

  url.searchParams.set("model", params.model ?? "nova-3-general");
  url.searchParams.set("smart_format", "true");
  url.searchParams.set("diarize", "true");
  url.searchParams.set("punctuate", "true");
  url.searchParams.set("mip_opt_out", "false");

  if (params.languages && params.languages.length > 0) {
    if (params.languages.length === 1) {
      url.searchParams.set("language", params.languages[0]);
    } else {
      url.searchParams.set("detect_language", "true");
    }
  } else {
    url.searchParams.set("detect_language", "true");
  }

  if (params.keywords && params.keywords.length > 0) {
    for (const keyword of params.keywords) {
      url.searchParams.append("keywords", keyword);
    }
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
      "Content-Type": contentType,
      Accept: "application/json",
    },
    body: audioData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Deepgram batch transcription failed: ${response.status} - ${errorText}`,
    );
  }

  return response.json() as Promise<BatchResponse>;
};
