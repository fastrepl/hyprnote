import { createFileRoute, redirect } from "@tanstack/react-router";
import { id } from "../utils";

export const Route = createFileRoute("/app/new")({
  beforeLoad: async ({ context: { hybridStore } }) => {
    const sessionId = id();

    hybridStore!.setRow("sessions", sessionId, {
      title: "new",
      humanId: "1",
      createdAt: new Date().toISOString(),
    });

    return redirect({
      to: "/app/note/$id",
      params: { id: sessionId },
    });
  },
});
