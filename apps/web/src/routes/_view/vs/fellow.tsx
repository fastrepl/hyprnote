import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/vs/fellow")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_view/vs/fellow"!</div>;
}
