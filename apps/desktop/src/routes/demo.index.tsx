import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/demo/")({
  component: Component,
});

function Component() {
  return <div>Hello "/demo/"!</div>;
}
