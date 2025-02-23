import { invoke } from "@tauri-apps/api/core";

export { events } from "./bindings.gen";

export const commands = {
  async fetch(): Promise<Response> {
    return await invoke("plugin:sse|fetch");
  },
};
