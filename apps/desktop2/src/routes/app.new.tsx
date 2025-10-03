import { createFileRoute, redirect } from "@tanstack/react-router";
import { id } from "../utils";

export const Route = createFileRoute("/app/new")({
  beforeLoad: async ({ context: { persistedStore } }) => {
    const sessionId = id();
    const user_id = persistedStore!.getValue("_user_id")!;

    persistedStore!.setRow("sessions", sessionId, {
      title: "new",
      user_id,
      created_at: new Date().toISOString(),
    });

    return redirect({
      to: "/app/note/$id",
      params: { id: sessionId },
    });
  },
});
