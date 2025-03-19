import { commands as dbCommands } from "@hypr/plugin-db";
import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/app/organization/$id")({
  component: Component,
  loader: async ({ context: { queryClient }, params }) => {
    const organization = await queryClient.fetchQuery({
      queryKey: ["organization", params.id],
      queryFn: () => dbCommands.getOrganization(params.id),
    });

    if (!organization) {
      throw notFound();
    }

    return { organization };
  },
});

function Component() {
  const { organization } = Route.useLoaderData();

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1">
        <pre>{JSON.stringify(organization, null, 2)}</pre>
      </div>
    </div>
  );
}
