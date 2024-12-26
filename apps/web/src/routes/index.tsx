import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Component,
});

function Component() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      Nothing here, yet.
    </div>
  );
}
