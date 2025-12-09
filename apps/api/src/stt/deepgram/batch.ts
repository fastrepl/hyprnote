import { env } from "../../env";

const DEEPGRAM_BATCH_URL = "https://api.deepgram.com/v1/listen";

export type DeepgramListenParams = {
  searchParams: URLSearchParams;
};

export type DeepgramListenResponse = {
  metadata: {
    transaction_key?: string;
    request_id: string;
    sha256: string;
    created: string;
    duration: number;
    channels: number;
    models: string[];
    model_info: Record<string, unknown>;
  };
  results: {
    channels: Array<{
      search?: Array<{
        query: string;
        hits: Array<{
          confidence: number;
          start: number;
          end: number;
          snippet: string;
        }>;
      }>;
      alternatives: Array<{
        transcript: string;
        confidence: number;
        words: Array<{
          word: string;
          start: number;
          end: number;
          confidence: number;
          speaker?: number;
          speaker_confidence?: number;
          punctuated_word?: string;
        }>;
        paragraphs?: {
          transcript: string;
          paragraphs: Array<{
            sentences: Array<{
              text: string;
              start: number;
              end: number;
            }>;
            speaker?: number;
            num_words?: number;
            start: number;
            end: number;
          }>;
        };
      }>;
      detected_language?: string;
    }>;
    utterances?: Array<{
      start: number;
      end: number;
      confidence: number;
      channel: number;
      transcript: string;
      words: Array<{
        word: string;
        start: number;
        end: number;
        confidence: number;
        speaker?: number;
        speaker_confidence?: number;
        punctuated_word?: string;
      }>;
      speaker?: number;
      id?: string;
    }>;
    summary?: {
      result?: string;
      short?: string;
    };
  };
};

export const transcribeWithDeepgram = async (
  body: ArrayBuffer | string,
  contentType: string,
  params: DeepgramListenParams,
): Promise<DeepgramListenResponse> => {
  const url = new URL(DEEPGRAM_BATCH_URL);

  for (const [key, value] of params.searchParams.entries()) {
    url.searchParams.append(key, value);
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
      "Content-Type": contentType,
      Accept: "application/json",
    },
    body: body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Deepgram batch transcription failed: ${response.status} - ${errorText}`,
    );
  }

  return response.json() as Promise<DeepgramListenResponse>;
};
