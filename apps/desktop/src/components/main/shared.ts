import { useRouteContext } from "@tanstack/react-router";
import { useCallback } from "react";
import { useTabs } from "../../store/zustand/tabs";
import { id } from "../../utils";

export function useNewNote({ behavior = "new" }: { behavior?: "new" | "current" }) {
  const { persistedStore, internalStore } = useRouteContext({ from: "__root__" });
  const { openNew, openCurrent } = useTabs();

  const handler = useCallback(() => {
    const user_id = internalStore?.getValue("user_id");
    const sessionId = id();

    persistedStore?.setRow("sessions", sessionId, {
      user_id,
      created_at: new Date().toISOString(),
      title: "",
    });

    const ff = behavior === "new" ? openNew : openCurrent;
    ff({ type: "sessions", id: sessionId });
  }, [persistedStore, internalStore, openNew, openCurrent, behavior]);

  return handler;
}
