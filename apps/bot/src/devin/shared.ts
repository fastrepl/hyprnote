import { env } from "../env.js";

export const DEVIN_API_BASE_URL = "https://api.devin.ai/v1";

export async function fetchFromDevin(
  input: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${env.DEVIN_API_KEY}`);

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Devin API request failed: ${response.status} ${response.statusText} - ${body}`,
    );
  }

  return response;
}
