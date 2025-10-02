import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const schema = z.object({
  view: z.enum(["calendar"]).default("calendar"),
});

export const Route = createFileRoute("/app/finder")({
  component: Component,
  validateSearch: zodValidator(schema),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps: { search } }) => {
    return search;
  },
});

function Component() {
  const data = Route.useLoaderData();

  return (
    <div className="flex flex-col h-full">
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
