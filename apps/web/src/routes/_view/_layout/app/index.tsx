import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/_layout/app/")({
  component: Component,
});

function Component() {
  return <div>Hello "/app/"!</div>;
}
