import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/callback/auth")({
  component: Component,
});

function Component() {
  return (
    <div>
      123
    </div>
  );
}
