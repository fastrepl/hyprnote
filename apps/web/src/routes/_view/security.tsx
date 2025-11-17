import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/security")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_view/security"!</div>;
}
