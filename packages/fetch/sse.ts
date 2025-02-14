import { Channel } from "@tauri-apps/api/core";

export const fetchSSE = <T>(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1],
  channel: Channel<T>,
): ReturnType<typeof fetch> => {
  return new Promise((resolve, reject) => {
    resolve(new Response());
  });
};
