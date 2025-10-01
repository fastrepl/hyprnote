import { createFileRoute } from "@tanstack/react-router";

import * as main from "../tinybase/store/hybrid";

export const Route = createFileRoute("/app/settings")({
  component: Component,
});

function Component() {
  const row = main.UI.useRow("users", "1", main.STORE_ID);
  const store = main.UI.useStore(main.STORE_ID);

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
