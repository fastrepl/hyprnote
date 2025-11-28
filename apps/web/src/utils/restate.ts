import * as clients from "@restatedev/restate-sdk-clients";

const RESTATE_INGRESS_URL = process.env.RESTATE_INGRESS_URL ?? "http://localhost:8080";

export const restateClient = clients.connect({ url: RESTATE_INGRESS_URL });

export async function startAudioPipeline(params: {
  pipelineId: string;
  userId: string;
  audioUrl: string;
}) {
  return restateClient
    .workflowClient<AudioPipelineApi>({ name: "AudioPipeline" }, params.pipelineId)
    .workflowSubmit({ userId: params.userId, audioUrl: params.audioUrl });
}

export async function getAudioPipelineStatus(pipelineId: string) {
  return restateClient
    .workflowClient<AudioPipelineApi>({ name: "AudioPipeline" }, pipelineId)
    .getStatus();
}

export async function sendDeepgramCallback(pipelineId: string, payload: DeepgramCallbackPayload) {
  return restateClient
    .workflowClient<AudioPipelineApi>({ name: "AudioPipeline" }, pipelineId)
    .onDeepgramResult(payload);
}

interface AudioPipelineApi {
  workflowSubmit(req: { userId: string; audioUrl: string }): Promise<StatusState>;
  getStatus(): Promise<StatusState>;
  onDeepgramResult(payload: DeepgramCallbackPayload): Promise<void>;
}

interface StatusState {
  status: "QUEUED" | "TRANSCRIBING" | "TRANSCRIBED" | "LLM_RUNNING" | "DONE" | "ERROR";
  transcript?: string;
  llmResult?: unknown;
  error?: string;
}

interface DeepgramCallbackPayload {
  request_id: string;
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
