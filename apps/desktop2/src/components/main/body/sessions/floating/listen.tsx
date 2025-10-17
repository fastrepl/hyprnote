import { Icon } from "@iconify-icon/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import useMediaQuery from "beautiful-react-hooks/useMediaQuery";
import { useCallback, useState } from "react";

import { Spinner } from "@hypr/ui/components/ui/spinner";
import { useListener } from "../../../../../contexts/listener";
import * as persisted from "../../../../../store/tinybase/persisted";
import { type Tab } from "../../../../../store/zustand/tabs";
import { FloatingButton } from "./shared";

type RemoteMeeting =
  | { type: "zoom"; url: string | null }
  | { type: "google-meet"; url: string | null };

export function ListenButton({ tab }: { tab: Extract<Tab, { type: "sessions" }> }) {
  const { status, loading, stop } = useListener((state) => ({
    status: state.status,
    loading: state.loading,
    start: state.start,
    stop: state.stop,
  }));

  if (loading) {
    return (
      <FloatingButton onClick={stop}>
        <Spinner />
      </FloatingButton>
    );
  }

  if (status === "inactive") {
    return <BeforeMeeingButton tab={tab} />;
  }

  if (status === "running_active") {
    return <DuringMeetingButton />;
  }
}

function BeforeMeeingButton({ tab }: { tab: Extract<Tab, { type: "sessions" }> }) {
  const remote = useRemoteMeeting(tab.id);
  const isNarrow = useMediaQuery("(max-width: 870px)");

  const start = useListener((state) => state.start);

  const handleClick = useCallback(() => {
    start();
    if (remote?.url) {
      openUrl(remote.url);
    }
  }, [start, remote]);

  if (remote?.type === "zoom") {
    return (
      <FloatingButton
        onClick={handleClick}
        icon={<Icon icon="streamline-logos:zoom-logo-1-block" className="w-5 h-5 text-blue-300" />}
      >
        {isNarrow ? "Join & Listen" : "Join Zoom & Start listening"}
      </FloatingButton>
    );
  }

  if (remote?.type === "google-meet") {
    return (
      <FloatingButton
        onClick={handleClick}
        icon={<Icon icon="logos:google-meet" className="w-5 h-5" />}
      >
        {isNarrow ? "Join & Listen" : "Join Google Meet & Start listening"}
      </FloatingButton>
    );
  }

  return (
    <FloatingButton
      onClick={handleClick}
      icon={<Icon icon="lucide:mic" className="w-5 h-5" />}
    >
      Start listening
    </FloatingButton>
  );
}

function DuringMeetingButton() {
  const stop = useListener((state) => state.stop);
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);

  return (
    <FloatingButton
      onClick={stop}
      icon={hovered ? <Icon icon="lucide:stop-circle" className="w-5 h-5" /> : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span>
        {hovered
          ? "Stop listening"
          : (
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>Listening...</span>
            </div>
          )}
      </span>
    </FloatingButton>
  );
}

function useRemoteMeeting(sessionId: string): RemoteMeeting | null {
  const note = persisted.UI.useCell("sessions", sessionId, "raw_md", persisted.STORE_ID);
  console.log(note);

  const remote = {
    type: "google-meet",
    url: null,
  } as RemoteMeeting | null;

  return remote;
}
