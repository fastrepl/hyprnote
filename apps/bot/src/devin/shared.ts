import { env } from "../env";

export const DEVIN_API_BASE_URL = "https://api.devin.ai/v1";

export async function fetchFromDevin(
  input: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.DEVIN_API_KEY}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Devin API request failed: ${response.status} ${response.statusText} - ${body}`,
    );
  }

  return response;
}
