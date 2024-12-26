import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  component: Component,
});

function Component() {
  return <div>Hello "/settings"!</div>;
}
