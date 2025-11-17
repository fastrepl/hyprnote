import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/product/memory")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_view/product/memory"!</div>;
}
