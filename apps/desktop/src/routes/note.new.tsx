import { z } from "zod";
import { createFileRoute, redirect } from "@tanstack/react-router";

const schema = z.object({
  eventId: z.string().optional(),
});

export const Route = createFileRoute("/note/new")({
  beforeLoad: ({ search }) => {
    if (search.eventId) {
      // link event when creating event
    }

    // id returned from creating note
    const id = crypto.randomUUID();

    throw redirect({
      to: "/note/$id",
      params: { id },
    });
  },
  component: () => null,
  validateSearch: schema,
});
