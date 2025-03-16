import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/")({
  component: Component,
});

function Component() {
  return (
    <div className="flex flex-col gap-6 min-h-screen w-full items-center justify-center">
      <h1 className="text-2xl font-bold">Nothing here</h1>
      <Link to="/app/new" className="bg-neutral-700 hover:bg-neutral-800 text-white px-4 py-2 rounded-md">
        <Trans>New note</Trans>
      </Link>
    </div>
  );
}
