import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import * as hybrid from "../tinybase/store/hybrid";

export const Route = createFileRoute("/app/")({
  component: Component,
});

function Component() {
  const row = hybrid.UI.useRow("users", "1", hybrid.STORE_ID);

  const navigate = useNavigate();

  const handleCLick = () => {
    windowsCommands.windowShow({ type: "settings" });
  };

  const handleSeed = hybrid.UI.useSetTableCallback(
    "sessions",
    () => ({
      "123": {
        title: "Session 2",
        userId: "1",
        createdAt: new Date().toISOString(),
      },
    }),
    [],
    hybrid.STORE_ID,
  );

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>
      <p>{JSON.stringify(row)}</p>

      <button onClick={handleCLick}>Open</button>
      <button onClick={handleSeed}>Seed</button>
      <button onClick={() => navigate({ to: "/app/new" })}>New</button>
    </main>
  );
}
