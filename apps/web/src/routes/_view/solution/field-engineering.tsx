import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/solution/field-engineering")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_view/solution/field-engineering"!</div>;
}
