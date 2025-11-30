// https://docs.devin.ai/api-reference/sessions/terminate-a-session.
import { DEVIN_API_BASE_URL, fetchFromDevin } from "./shared.js";

export async function terminateDevinSession(sessionId: string): Promise<void> {
  await fetchFromDevin(`${DEVIN_API_BASE_URL}/sessions/${sessionId}`, {
    method: "DELETE",
  });
}
