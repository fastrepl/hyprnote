import type MuxPlayerElement from "@mux/mux-player";
import MuxPlayer from "@mux/mux-player-react/lazy";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useRef } from "react";
import { z } from "zod";

const schema = z.object({
  id: z.string(),
});

export const Route = createFileRoute("/video")({
  component: Component,
  validateSearch: zodValidator(schema),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { id } }) => {
    return { id };
  },
});

function Component() {
  const { id } = Route.useLoaderData();
  const player = useRef<MuxPlayerElement>(null);

  const styles = {
    "--bottom-controls": "none",
    "aspectRatio": "16 / 9",
  } as React.CSSProperties;

  return (
    <div
      data-tauri-drag-region
      className="w-full h-full relative"
    >
      <div className="absolute top-0 left-0 w-full h-11 bg-transparent z-50" data-tauri-drag-region></div>
      <MuxPlayer
        ref={player}
        playbackId={id}
        autoPlay={false}
        style={styles}
        loading="viewport"
      />
    </div>
  );
}
