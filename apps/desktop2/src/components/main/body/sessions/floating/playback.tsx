import { CassetteTapeIcon, PlayIcon, StopCircleIcon } from "lucide-react";
import { useState } from "react";

import { useAudioPlayer } from "../../../../../contexts/audio-player/provider";
import { FloatingButton } from "./shared";

export function PlaybackButton() {
  const { state } = useAudioPlayer();

  if (state === "stopped") {
    return <PlaybackButtonStopped />;
  }

  return <PlaybackButtonNonStopped />;
}

function PlaybackButtonStopped() {
  const { start } = useAudioPlayer();

  return (
    <FloatingButton
      icon={<PlayIcon className="w-4 h-4" />}
      onClick={start}
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

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
