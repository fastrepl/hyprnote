import { createFileRoute } from "@tanstack/react-router";

import { commands as dbCommands } from "@hypr/plugin-db";

export const Route = createFileRoute("/app/transcript/$id")({
  component: Component,
  loader: async ({ params: { id } }) => {
    const session = await dbCommands.getSession({ id });
    return { session };
  },
});

function Component() {
  const { session } = Route.useLoaderData();

  return (
    <div>
      <pre>{JSON.stringify(session, null, 2)}</pre>
    </div>
  );
}
