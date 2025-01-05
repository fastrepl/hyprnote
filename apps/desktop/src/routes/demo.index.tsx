import { createFileRoute } from "@tanstack/react-router";
import MuxPlayer from "@mux/mux-player-react";

export const Route = createFileRoute("/demo/")({
  component: Component,
});

function Component() {
  return (
    <div className="p-4">
      <div className="h-[400px] w-[600px]">
        <MuxPlayer playbackId="a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M" />
      </div>
      <div className="h-[400px] w-[600px]">
        <MuxPlayer playbackId="a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M" />
      </div>
    </div>
  );
}
