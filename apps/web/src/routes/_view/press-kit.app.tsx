import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/press-kit/app")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_view/press-kit/press-kit/app"!</div>;
}
