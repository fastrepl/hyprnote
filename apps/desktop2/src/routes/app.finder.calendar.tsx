import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import * as persisted from "../tinybase/store/persisted";

const schema = z.object({
  date: z.string().optional(),
});

export const Route = createFileRoute("/app/finder/calendar")({
  component: Component,
  validateSearch: zodValidator(schema),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps: { search } }) => {
    return search;
  },
});

function Component() {
  const data = Route.useLoaderData();
  const events = persisted.UI.useSliceIds(persisted.INDEXES.eventsByMonth, persisted.STORE_ID);

  return (
    <div className="flex flex-col h-full">
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <pre>{JSON.stringify(events, null, 2)}</pre>
    </div>
  );
}
