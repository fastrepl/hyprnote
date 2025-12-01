// https://docs.devin.ai/api-reference/sessions/retrieve-details-about-an-existing-session
import { DEVIN_API_BASE_URL, fetchFromDevin } from "./shared.js";

export const DevinSessionStatus = {
  Working: "working",
  Blocked: "blocked",
  Expired: "expired",
  Finished: "finished",
  SuspendRequested: "suspend_requested",
  SuspendRequestedFrontend: "suspend_requested_frontend",
  ResumeRequested: "resume_requested",
  ResumeRequestedFrontend: "resume_requested_frontend",
  Resumed: "resumed",
} as const;

export type DevinSessionStatus =
  (typeof DevinSessionStatus)[keyof typeof DevinSessionStatus];

export interface DevinSessionDetail {
  session_id: string;
  status: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  snapshot_id: string | null;
  playbook_id: string | null;
  tags: string[] | null;
  pull_request: { url: string } | null;
  structured_output: Record<string, unknown> | null;
  status_enum: DevinSessionStatus | null;
}

export async function getDevinSessionDetail(
  sessionId: string,
): Promise<DevinSessionDetail> {
  const url = `${DEVIN_API_BASE_URL}/sessions/${sessionId}`;

  const response = await fetchFromDevin(url, {
    method: "GET",
  });

  return (await response.json()) as DevinSessionDetail;
}

export function isDevinSessionWorking(detail: DevinSessionDetail): boolean {
  return detail.status_enum === DevinSessionStatus.Working;
}
