import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/vs/bluedot")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_view/vs/bluedot"!</div>;
}
