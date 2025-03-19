import { commands as dbCommands } from "@hypr/plugin-db";
import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/app/human/$id")({
  component: Component,
  loader: async ({ context: { queryClient }, params }) => {
    const human = await queryClient.fetchQuery({
      queryKey: ["human", params.id],
      queryFn: () => dbCommands.getHuman(params.id),
    });

    if (!human) {
      throw notFound();
    }

    return { human };
  },
});

function Component() {
  const { human } = Route.useLoaderData();

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1">
        <pre>{JSON.stringify(human, null, 2)}</pre>
      </div>
    </div>
  );
}
