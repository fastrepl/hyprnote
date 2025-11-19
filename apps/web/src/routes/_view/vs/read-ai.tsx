import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/vs/read-ai")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_view/vs/read-ai"!</div>;
}
