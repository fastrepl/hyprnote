// https://docs.devin.ai/api-reference/sessions/send-a-message-to-an-existing-devin-session
import { DEVIN_API_BASE_URL, fetchFromDevin } from "./shared";

export async function sendMessageToDevinSession(
  sessionId: string,
  message: string,
): Promise<void> {
  await fetchFromDevin(`${DEVIN_API_BASE_URL}/sessions/${sessionId}/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });
}
