import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useRow } from "tinybase/ui-react";

import { commands as windowsCommands } from "@hypr/plugin-windows";

import { mainStore } from "../tinybase";

export const Route = createFileRoute("/app/")({
  component: Component,
});

function Component() {
  const row = useRow("users", "1", mainStore);

  useEffect(() => {
    mainStore.setTables({ users: { "1": { name: "John" } } });
  }, []);

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
