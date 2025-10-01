import { createFileRoute } from "@tanstack/react-router";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { TypedUI as UI_Main } from "../tinybase/store/main";

export const Route = createFileRoute("/app/")({
  component: Component,
});

function Component() {
  const row = UI_Main.useRow("users", "1");

  const handleSync = () => {
  };

  const handleSeed = () => {
  };

  const handleCLick = () => {
    windowsCommands.windowShow({ type: "settings" });
  };

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>
      <p>{JSON.stringify(row)}</p>

      <button onClick={handleCLick}>Open</button>
      <button onClick={handleSeed}>Seed</button>
      <button onClick={handleSync}>Sync</button>
    </main>
  );
}
