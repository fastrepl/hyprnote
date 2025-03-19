import { commands as dbCommands } from "@hypr/plugin-db";
import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

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
  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
