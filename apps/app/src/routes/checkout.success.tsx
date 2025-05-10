import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/checkout/success")({
  component: Component,
});

function Component() {
  return <div>Hello "/checkout/success"!</div>;
}
