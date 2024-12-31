import { Command, open } from "@tauri-apps/plugin-shell";

export async function openURL(url: string) {
  await open(url);
}

export async function runAppleScript(script: string) {
  return await Command.create("osascript", ["-e", script]).execute();
}
