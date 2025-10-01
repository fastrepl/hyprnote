import { createFileRoute } from "@tanstack/react-router";
import { useRow, useStore } from "tinybase/ui-react";

export const Route = createFileRoute("/app/settings")({
  component: Component,
});

function Component() {
  const row = useRow("users", "1");
  const mainStore = useStore();

  const handleModify = () => {
    mainStore?.setTables({ users: { "1": { name: "John2" } } });
  };

  return (
    <main className="container">
      <h1>Settings</h1>
      <p>{JSON.stringify(row)}</p>
      <button onClick={handleModify}>modify</button>
    </main>
  );
}
