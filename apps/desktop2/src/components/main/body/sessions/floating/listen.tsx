import { Icon } from "@iconify-icon/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import useMediaQuery from "beautiful-react-hooks/useMediaQuery";
import { useCallback, useState } from "react";

import { SoundIndicator } from "@hypr/ui/components/block/sound-indicator";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { useListener } from "../../../../../contexts/listener";
import * as persisted from "../../../../../store/tinybase/persisted";
import { type Tab } from "../../../../../store/zustand/tabs";
import { FloatingButton, formatTime } from "./shared";

type RemoteMeeting =
  | { type: "zoom"; url: string | null }
  | { type: "google-meet"; url: string | null }
  | { type: "webex"; url: string | null };

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
  const store = persisted.UI.useStore(persisted.STORE_ID) as persisted.Store;

  const handleClick = useCallback(() => {
    if (store) {
      start(tab.id, store);
      if (remote?.url) {
        openUrl(remote.url);
      }
    }
  }, [start, remote, tab.id, store]);

  if (remote?.type === "zoom") {
    return (
      <FloatingButton
        onClick={handleClick}
        icon={<img src="/assets/zoom.png" alt="Zoom" className="w-5 h-5" />}
      >
        {isNarrow ? "Join & Listen" : "Join Zoom & Start listening"}
      </FloatingButton>
    );
  }

  if (remote?.type === "google-meet") {
    return (
      <FloatingButton
        onClick={handleClick}
        icon={<img src="/assets/meet.png" alt="Google Meet" className="w-5 h-5" />}
      >
        {isNarrow ? "Join & Listen" : "Join Google Meet & Start listening"}
      </FloatingButton>
    );
  }

  if (remote?.type === "webex") {
    return (
      <FloatingButton
        onClick={handleClick}
        icon={<img src="/assets/webex.png" alt="Webex" className="w-5 h-5" />}
      >
        {isNarrow ? "Join & Listen" : "Join Webex & Start listening"}
      </FloatingButton>
    );
  }

  return (
    <FloatingButton
      onClick={handleClick}
    >
      Start listening
    </FloatingButton>
  );
}

function DuringMeetingButton() {
  const stop = useListener((state) => state.stop);
  const { amplitude, seconds } = useListener(({ amplitude, seconds }) => ({ amplitude, seconds }));
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
            <div className="flex flex-row items-center gap-4">
              <span className="text-gray-500 text-sm">{formatTime(seconds)}</span>
              <SoundIndicator value={[amplitude.mic, amplitude.speaker]} color="#ef4444" />
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
