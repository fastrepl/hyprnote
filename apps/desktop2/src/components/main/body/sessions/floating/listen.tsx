import { Icon } from "@iconify-icon/react";
import { openUrl } from "@tauri-apps/plugin-opener";

import * as persisted from "../../../../../store/tinybase/persisted";
import { type Tab } from "../../../../../store/zustand/tabs";
import { FloatingButton } from "./shared";

type RemoteMeeting =
  | { type: "zoom"; url: string }
  | { type: "google-meet"; url: string };

export function ListenButton({ tab }: { tab: Extract<Tab, { type: "sessions" }> }) {
  const remote = useRemoteMeeting(tab.id);

  if (remote?.type === "zoom") {
    return (
      <FloatingButton
        onClick={() => openUrl(remote.url)}
        icon={<Icon icon="streamline-logos:zoom-logo-1-block" className="w-5 h-5 text-blue-300" />}
      >
        Join Zoom & Start listening
      </FloatingButton>
    );
  }

  if (remote?.type === "google-meet") {
    return (
      <FloatingButton
        onClick={() => openUrl(remote.url)}
        icon={<Icon icon="logos:google-meet" className="w-5 h-5" />}
      >
        Join Google Meet & Start listening
      </FloatingButton>
    );
  }

  return (
    <FloatingButton>
      <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
      <span>Start listening</span>
    </FloatingButton>
  );
}

function useRemoteMeeting(sessionId: string): RemoteMeeting | null {
  const note = persisted.UI.useCell("sessions", sessionId, "raw_md", persisted.STORE_ID);
  const remote = {
    type: "google-meet",
    url: note,
  } as RemoteMeeting | null;

  return remote;
}
