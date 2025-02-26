import { z } from "zod";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { commands as dbCommands, type Session } from "@hypr/plugin-db";

import { commands as authCommands } from "@hypr/plugin-auth";

const schema = z.object({
  eventId: z.string().optional(),
});

export const Route = createFileRoute("/note/new")({
  beforeLoad: async ({ search }) => {
    let session: Session | null = null;

    const userId = await authCommands.getFromVault("userId");

    const emptySession: Session = {
      id: crypto.randomUUID() as string,
      user_id: userId,
      timestamp: new Date().toISOString(),
      calendar_event_id: null,
      title: "Untitled",
      audio_local_path: null,
      audio_remote_path: null,
      raw_memo_html: "",
      enhanced_memo_html: null,
      conversations: [],
    };

    try {
      session = await dbCommands.upsertSession(emptySession);
    } catch (error) {
      console.error(error);
      throw redirect({ to: "/" });
    }

    if (search.eventId) {
      dbCommands.setSessionEvent(session.id, search.eventId);
    }

    throw redirect({
      to: "/note/$id",
      params: { id: session.id },
    });
  },
  component: () => null,
  validateSearch: zodValidator(schema),
});
