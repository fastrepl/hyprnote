import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const schema = z.object({
  event_id: z.boolean().optional(),
});

export const Route = createFileRoute("/app/note")({
  validateSearch: zodValidator(schema),
  beforeLoad: ({ context: { queryClient, sessionsStore }, search: { event_id } }) => {
    return queryClient.fetchQuery({
      queryKey: ["session", "event", event_id],
      queryFn: async () => {
      },
    });
  },
});
