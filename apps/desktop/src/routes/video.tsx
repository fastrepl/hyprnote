import type MuxPlayerElement from "@mux/mux-player";
import type { MuxPlayerElementEventMap } from "@mux/mux-player";
import MuxPlayer from "@mux/mux-player-react/lazy";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { commands as windowsCommands, events as windowsEvents } from "@hypr/plugin-windows";

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
  const [didExpandRightPanel, setDidExpandRightPanel] = useState(false);

  const styles = {
    "--bottom-controls": "none",
    aspectRatio: "16 / 9",
  } as React.CSSProperties;

  const handleEnded = () => {
    windowsEvents.mainWindowState
      .emit({
        left_sidebar_expanded: true,
        right_panel_expanded: false,
      })
      .then(() => {
        windowsCommands.windowDestroy({ type: "video", value: id });
      });
  };

  const handleTimeUpdate = (e: MuxPlayerElementEventMap["timeupdate"]) => {
    if (e.timeStamp > 67500 && !didExpandRightPanel) {
      setDidExpandRightPanel(true);
      windowsEvents.mainWindowState.emit({
        left_sidebar_expanded: false,
        right_panel_expanded: true,
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (player.current) {
        player.current.play();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div data-tauri-drag-region className="w-full h-full relative">
      <div
        className="absolute top-0 left-0 w-full h-11 bg-transparent z-50"
        data-tauri-drag-region
      >
      </div>
      <MuxPlayer
        ref={player}
        playbackId={id}
        autoPlay={false}
        style={styles}
        loading="viewport"
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
      />
    </div>
  );
}
