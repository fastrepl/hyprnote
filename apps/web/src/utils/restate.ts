const RESTATE_INGRESS_URL =
  process.env.RESTATE_INGRESS_URL ?? "http://localhost:8080";

export interface StatusState {
  status:
    | "QUEUED"
    | "TRANSCRIBING"
    | "TRANSCRIBED"
    | "LLM_RUNNING"
    | "DONE"
    | "ERROR";
  transcript?: string;
  llmResult?: unknown;
  error?: string;
}

export interface DeepgramCallbackPayload {
  request_id?: string;
  metadata?: {
    request_id?: string;
  };
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
      }>;
    }>;
  };
}

export async function startAudioPipeline(params: {
  pipelineId: string;
  userId: string;
  audioUrl: string;
}): Promise<void> {
  const url = `${RESTATE_INGRESS_URL}/AudioPipeline/${encodeURIComponent(params.pipelineId)}/run/send`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: params.userId, audioUrl: params.audioUrl }),
  });
  if (!res.ok) {
    throw new Error(`Failed to start pipeline: ${res.status}`);
  }
}

export async function getAudioPipelineStatus(
  pipelineId: string,
): Promise<StatusState> {
  const url = `${RESTATE_INGRESS_URL}/AudioPipeline/${encodeURIComponent(pipelineId)}/getStatus`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(`Failed to get status: ${res.status}`);
  }
  return res.json();
}

export async function sendDeepgramCallback(
  pipelineId: string,
  payload: DeepgramCallbackPayload,
): Promise<void> {
  const url = `${RESTATE_INGRESS_URL}/AudioPipeline/${encodeURIComponent(pipelineId)}/onDeepgramResult`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to send callback: ${res.status}`);
  }
}
