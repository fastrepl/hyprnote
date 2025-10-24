import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/_layout/pricing")({
  component: Component,
});

function Component() {
  return <div>Hello "/_view/_layout/pricing"!</div>;
}
