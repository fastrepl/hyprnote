import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/vs/aside")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_view/vs/aside"!</div>;
}
