import { useMemo } from "react";

import { Spinner } from "@hypr/ui/components/ui/spinner";

import { useListener } from "../../../../../../contexts/listener";

export function TranscriptionProgress({ sessionId }: { sessionId: string }) {
  const { progress: progressRaw, mode } = useListener((state) => ({
    progress: state.batch[sessionId] ?? null,
    mode: state.getSessionMode(sessionId),
  }));

  const isRunning = mode === "running_batch";

  const statusLabel = useMemo(() => {
    if (!progressRaw) {
      return "Preparing audio";
    }

    const percent = Math.round(progressRaw.percentage * 100);
    return `${percent}%`;
  }, [progressRaw]);

  if (!isRunning) {
    return null;
  }

  return (
    <div className="mb-3">
      <div className="flex w-fit items-center gap-2 rounded-full bg-neutral-900 px-3 py-1 text-xs text-white shadow-sm">
        <Spinner size={12} className="text-white/80" />
        <span>Processing · {statusLabel}</span>
      </div>
    </div>
  );
}
