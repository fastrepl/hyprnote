import { createFileRoute } from "@tanstack/react-router";

import * as hybrid from "../tinybase/store/hybrid";

export const Route = createFileRoute("/app/settings")({
  component: Component,
});

function Component() {
  const row = hybrid.UI.useRow("users", "1", hybrid.STORE_ID);
  const store = hybrid.UI.useStore(hybrid.STORE_ID);

  const handleModify = () => {
    store?.setRow("users", "1", { name: "John2", email: "", createdAt: "" });
  };

  return (
    <main className="container">
      <h1>Settings</h1>
      <p>{JSON.stringify(row)}</p>
      <button onClick={handleModify}>modify</button>
    </main>
  );
}
