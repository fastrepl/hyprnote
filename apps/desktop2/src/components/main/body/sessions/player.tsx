import { useWavesurfer } from "@wavesurfer/react";
import { Pause, Play } from "lucide-react";
import { useCallback, useRef } from "react";

export function AudioPlayer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { wavesurfer, isPlaying, currentTime } = useWavesurfer({
    container: containerRef,
    height: 60,
    waveColor: "#666666",
    progressColor: "#333333",
    cursorColor: "#ffffff",
    cursorWidth: 2,
    barWidth: 3,
    barGap: 2,
    barRadius: 3,
    url,
    dragToSeek: true,
    hideScrollbar: true,
    normalize: true,
  });

  const onPlayPause = useCallback(() => {
    wavesurfer?.playPause();
  }, [wavesurfer]);

  const duration = wavesurfer?.getDuration() || 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 w-full bg-black border-t border-gray-800 z-50">
      <div className="flex items-center gap-4 px-6 py-4 w-full max-w-full">
        <button
          onClick={onPlayPause}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors flex-shrink-0"
        >
          {isPlaying
            ? <Pause className="w-6 h-6 text-white" fill="currentColor" />
            : <Play className="w-6 h-6 text-white" fill="currentColor" />}
        </button>

        <div className="flex items-center gap-2 text-sm text-gray-400 flex-shrink-0 min-w-[100px]">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div ref={containerRef} className="flex-1 min-w-0" style={{ minHeight: "60px", width: "100%" }} />
      </div>
    </div>
  );
}

const formatTime = (seconds: number) =>
  [Math.floor(seconds / 60), Math.floor(seconds % 60)]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
