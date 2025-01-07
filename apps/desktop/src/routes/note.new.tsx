import { z } from "zod";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";

import { actually_string } from "@/utils";
import { commands, type Session } from "@/types/tauri";

const schema = z.object({
  eventId: z.string().optional(),
});

export const Route = createFileRoute("/note/new")({
  beforeLoad: async ({ search }) => {
    if (search.eventId) {
      // link event when creating event
    }

    let session: Session | null = null;

    try {
      session = await commands.dbCreateSession({
        id: crypto.randomUUID(),
        title: "",
        raw_memo_html: "",
        timestamp: new Date().toISOString(),
        tags: actually_string<Session["tags"]>([]),
        audio_local_path: null,
        audio_remote_path: null,
        enhanced_memo_html: null,
        transcript: actually_string<Session["transcript"]>({
          speakers: [],
          blocks: [],
        }),
      });
    } catch (error) {
      console.error(error);
      throw redirect({ to: "/" });
    }

    throw redirect({
      to: "/note/$id",
      params: { id: session.id },
    });
  },
  component: () => null,
  validateSearch: zodValidator(schema),
});
