import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/product/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_view/product/"!</div>;
}
