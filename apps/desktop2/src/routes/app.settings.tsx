import { createFileRoute } from "@tanstack/react-router";
import { useRow } from "tinybase/ui-react";

import { mainStore } from "../tinybase";

export const Route = createFileRoute("/app/settings")({
  component: Component,
});

function Component() {
  const row = useRow("users", "1", mainStore);

  const handleModify = () => {
    mainStore.setTables({ users: { "1": { name: "John2" } } });
  };

  return (
    <main className="container">
      <h1>Settings</h1>
      <p>{JSON.stringify(row)}</p>
      <button onClick={handleModify}>modify</button>
    </main>
  );
}
