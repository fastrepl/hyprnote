import { useEffect } from "react";

import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";

import { useTauriStore } from "../stores/tauri";

const schema = z.object({
  k: z.string().min(1),
});

export const Route = createFileRoute("/callback/connect")({
  component: Component,
  validateSearch: zodValidator(schema),
});

function Component() {
  const setKey = useTauriStore((state) => state.setKey);
  const { k } = Route.useSearch();

  useEffect(() => {
    setKey(k);
  }, [setKey, k]);

  return <div>got {k}</div>;
}
