import { createFileRoute } from "@tanstack/react-router";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import * as main from "../tinybase/store/hybrid";

export const Route = createFileRoute("/app/")({
  component: Component,
});

function Component() {
  const row = main.UI.useRow("users", "1", main.STORE_ID);

  const handleCLick = () => {
    windowsCommands.windowShow({ type: "settings" });
  };

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>
      <p>{JSON.stringify(row)}</p>

      <button onClick={handleCLick}>Open</button>
    </main>
  );
}
