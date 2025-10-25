import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/app/account")({
  component: Component,
});

function Component() {
  return <div>Hello "/app/account"!</div>;
}
