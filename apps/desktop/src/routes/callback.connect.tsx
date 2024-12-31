import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { useTauriStore } from "../stores/tauri";
import { useEffect } from "react";

const schema = z.object({
  k: z.string().min(1),
});

export const Route = createFileRoute("/callback/connect")({
  component: Component,
  validateSearch: schema,
});

function Component() {
  const set = useTauriStore((state) => state.set);
  const { k } = Route.useSearch();

  useEffect(() => {
    set("key", k);
  }, [set, k]);

  return <div>got {k}</div>;
}
