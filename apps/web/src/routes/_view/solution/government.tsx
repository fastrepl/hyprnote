import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/solution/government")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_view/solution/government"!</div>;
}
