import { Icon } from "@iconify-icon/react";
import { openUrl } from "@tauri-apps/plugin-opener";

import { useListener } from "../../../../../contexts/listener";
import * as persisted from "../../../../../store/tinybase/persisted";
import { type Tab } from "../../../../../store/zustand/tabs";
import { FloatingButton } from "./shared";

type RemoteMeeting =
  | { type: "zoom"; url: string | null }
  | { type: "google-meet"; url: string | null };

export function ListenButton({ tab }: { tab: Extract<Tab, { type: "sessions" }> }) {
  const remote = useRemoteMeeting(tab.id);
  const { status, loading, start, stop } = useListener((state) => ({
    status: state.status,
    loading: state.loading,
    start: state.start,
    stop: state.stop,
  }));

  const isActive = status === "running_active";

  const handleClick = () => {
    if (isActive) {
      stop();
    } else {
      start();
      if (remote?.url) {
        openUrl(remote.url);
      }
    }
  };

  if (remote?.type === "zoom") {
    return (
      <FloatingButton
        onClick={handleClick}
        icon={<Icon icon="streamline-logos:zoom-logo-1-block" className="w-5 h-5 text-blue-300" />}
      >
        {loading ? "Loading..." : isActive ? "Stop listening" : "Join Zoom & Start listening"}
      </FloatingButton>
    );
  }

  if (remote?.type === "google-meet") {
    return (
      <FloatingButton
        onClick={handleClick}
        icon={<Icon icon="logos:google-meet" className="w-5 h-5" />}
      >
        {loading ? "Loading..." : isActive ? "Stop listening" : "Join Google Meet & Start listening"}
      </FloatingButton>
    );
  }

  return (
    <FloatingButton onClick={handleClick}>
      <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
      <span>{loading ? "Loading..." : isActive ? "Stop listening" : "Start listening"}</span>
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
