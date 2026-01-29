import { getIdentifier } from "@tauri-apps/api/app";

export * from "./timeline";
export * from "./segment";

export const id = () => crypto.randomUUID() as string;

export const deterministicEventId = (
  trackingIdEvent: string,
  startedAt: string,
): string => {
  const input = `${trackingIdEvent}::${startedAt}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  const hashHex = Math.abs(hash).toString(16).padStart(8, "0");
  return `${hashHex.slice(0, 8)}-${hashHex.slice(0, 4)}-4${hashHex.slice(1, 4)}-8${hashHex.slice(0, 3)}-${trackingIdEvent
    .slice(0, 12)
    .replace(/[^a-f0-9]/gi, "0")
    .padEnd(12, "0")}`;
};

export const getScheme = async (): Promise<string> => {
  const id = await getIdentifier();
  const schemes: Record<string, string> = {
    "com.hyprnote.stable": "hyprnote",
    "com.hyprnote.nightly": "hyprnote-nightly",
    "com.hyprnote.staging": "hyprnote-staging",
    "com.hyprnote.dev": "hypr",
  };
  return schemes[id] ?? "hypr";
};

// https://www.rfc-editor.org/rfc/rfc4122#section-4.1.7
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";
