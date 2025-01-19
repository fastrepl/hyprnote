import { z } from "zod";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";

import { commands, type Session } from "@/types/tauri";

const schema = z.object({
  eventId: z.string().optional(),
});

export const Route = createFileRoute("/note/new")({
  beforeLoad: async ({ search }) => {
    let session: Session | null = null;

    try {
      session = await commands.dbUpsertSession({
        id: crypto.randomUUID() as string,
        calendar_event_id: null,
        title: "",
        raw_memo_html: "",
        timestamp: new Date().toISOString(),
        tags: [],
        audio_local_path: null,
        audio_remote_path: null,
        enhanced_memo_html: null,
        transcript: {
          speakers: [],
          blocks: [],
        },
      });
    } catch (error) {
      console.error(error);
      throw redirect({ to: "/" });
    }

    if (search.eventId) {
      commands.dbSetSessionEvent(session.id, search.eventId);
    }

    throw redirect({
      to: "/note/$id",
      params: { id: session.id },
    });
  },
  component: () => null,
  validateSearch: zodValidator(schema),
});
