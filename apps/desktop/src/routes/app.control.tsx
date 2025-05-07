import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/control")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/app/control"!</div>;
}
