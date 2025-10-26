import { useQuery } from "@tanstack/react-query";
import { CassetteTapeIcon, PlayIcon, StopCircleIcon } from "lucide-react";
import { useState } from "react";

import { commands as miscCommands } from "@hypr/plugin-misc";
import { useAudioPlayer } from "../../../../../contexts/audio-player/provider";
import { FloatingButton, formatTime } from "./shared";

export function PlaybackButton({ sessionId }: { sessionId: string }) {
  const { state } = useAudioPlayer();

  if (state === "stopped") {
    return <PlaybackButtonStopped sessionId={sessionId} />;
  }

  return <PlaybackButtonNonStopped />;
}

function PlaybackButtonStopped({ sessionId }: { sessionId: string }) {
  const { start } = useAudioPlayer();

  const audioExistQuery = useQuery({
    queryKey: ["audio-exist", sessionId],
    queryFn: () => miscCommands.audioExist(sessionId),
    select: (result) => result.status === "ok" && result.data,
  });

  return (
    <FloatingButton
      disabled={!audioExistQuery.data}
      icon={<PlayIcon className="w-4 h-4" />}
      onClick={start}
      tooltip={!audioExistQuery.data
        ? {
          content: <p>No recording available</p>,
        }
        : undefined}
    >
      Play recording
    </FloatingButton>
  );
}

function PlaybackButtonNonStopped() {
  const { stop, time } = useAudioPlayer();
  const [hover, setHover] = useState(false);

  return (
    <FloatingButton
      icon={hover
        ? <StopCircleIcon className="w-4 h-4" />
        : <CassetteTapeIcon className="w-4 h-4" />}
      onClick={() => {
        stop();
        setHover(false);
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {hover
        ? "Stop recording"
        : `${formatTime(time.current)} / ${formatTime(time.total)}`}
    </FloatingButton>
  );
}
