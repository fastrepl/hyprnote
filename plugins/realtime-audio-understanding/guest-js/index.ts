import { Channel, invoke } from "@tauri-apps/api/core";

export async function startSession(
  channel: Channel<string>,
): Promise<string | null> {
  return await invoke<{ value?: string }>(
    "plugin:plugin-realtime-audio-understanding|start_session",
    {
      channel,
    },
  ).then((r) => (r.value ? r.value : null));
}

export async function stopSession(): Promise<string | null> {
  return await invoke<{ value?: string }>(
    "plugin:plugin-realtime-audio-understanding|stop_session",
  ).then((r) => (r.value ? r.value : null));
}
