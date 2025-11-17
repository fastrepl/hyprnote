import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/solution/legal")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_view/solution/legal"!</div>;
}
