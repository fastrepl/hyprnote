import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/plans")({
  component: Component,
});

function Component() {
  return <div>Plans</div>;
}
