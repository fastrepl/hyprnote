import { AlertCircleIcon } from "lucide-react";
import { useMemo } from "react";

import { Spinner } from "@hypr/ui/components/ui/spinner";

import { useListener } from "../../../../../../contexts/listener";

export function TranscriptionProgress({ sessionId }: { sessionId: string }) {
  const { progress: progressRaw, mode } = useListener((state) => ({
    progress: state.batch[sessionId] ?? null,
    mode: state.getSessionMode(sessionId),
  }));

  const isRunning = mode === "running_batch";
  const hasError = progressRaw?.error != null;

  const statusLabel = useMemo(() => {
    if (!progressRaw || progressRaw.percentage === 0) {
      return "...";
    }

    const percent = Math.round(progressRaw.percentage * 100);
    return `${percent}%`;
  }, [progressRaw]);

  if (hasError) {
    return (
      <div className="mb-3">
        <div className="flex w-fit items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/40 px-3 py-2 text-xs text-destructive shadow-xs">
          <AlertCircleIcon size={14} className="text-destructive shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">Transcription failed</span>
            <span className="text-destructive/80">{progressRaw.error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isRunning) {
    return null;
  }

  return (
    <div className="mb-3">
      <div className="flex w-fit items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground shadow-xs">
        <Spinner size={12} className="text-primary-foreground/80" />
        <span>Processing · {statusLabel}</span>
      </div>
    </div>
  );
}
