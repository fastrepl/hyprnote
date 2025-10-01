import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/settings")({
  component: Component,
});

function Component() {
  return (
    <main className="container">
      <h1>Settings</h1>
    </main>
  );
}
