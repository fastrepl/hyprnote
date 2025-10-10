import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/chat/$id")({
  component: Component,
});

function Component() {
  return <div>Hello "/app/chat/$id"!</div>;
}
