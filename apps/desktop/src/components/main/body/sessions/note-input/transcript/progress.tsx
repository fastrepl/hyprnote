import { useMemo } from "react";

import { Spinner } from "@hypr/ui/components/ui/spinner";

import { useListener } from "../../../../../../contexts/listener";

type ProgressDisplay = {
  percent: number | null;
  currentLabel: string;
  totalLabel?: string;
};

export function TranscriptionProgress({ sessionId }: { sessionId: string }) {
  const { progress: progressRaw, mode } = useListener((state) => ({
    progress: state.batchProgressBySession[sessionId] ?? null,
    mode: state.getSessionMode(sessionId),
  }));

  const isRunning = mode === "running_batch";

  const display = useMemo<ProgressDisplay | null>(() => {
    if (!progressRaw) {
      return null;
    }

    const audio = Math.max(0, progressRaw.audioDuration ?? 0);
    const transcript = Math.max(0, progressRaw.transcriptDuration ?? 0);
    const clampedTranscript = audio > 0 ? Math.min(transcript, audio) : transcript;
    const ratio = audio > 0 ? clampedTranscript / audio : null;
    const percent = ratio !== null ? Math.round(ratio * 100) : null;

    return {
      percent,
      currentLabel: formatSeconds(clampedTranscript),
      totalLabel: audio > 0 ? formatSeconds(audio) : undefined,
    };
  }, [progressRaw]);

  if (!isRunning) {
    return null;
  }

  const timing = display
    ? display.totalLabel
      ? `${display.currentLabel} / ${display.totalLabel}`
      : display.currentLabel
    : null;

  const percentLabel = display && display.percent !== null ? ` ${display.percent}%` : "";
  const statusLabel = timing ?? "Preparing audio";

  return (
    <div className="mb-3">
      <div className="flex w-fit items-center gap-2 rounded-full bg-neutral-900 px-3 py-1 text-xs text-white shadow-sm">
        <Spinner size={12} className="text-white/80" />
        <span>
          Processing
          {percentLabel}
          {` · ${statusLabel}`}
        </span>
      </div>
    </div>
  );
}

function formatSeconds(seconds: number): string {
  const total = Math.round(Math.max(0, seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
