import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/solution/project-management")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_view/solution/project-management"!</div>;
}
