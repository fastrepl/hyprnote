import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/vs/bear")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_view/vs/bear"!</div>;
}
