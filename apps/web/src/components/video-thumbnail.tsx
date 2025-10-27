import { cn } from "@hypr/utils";
import { Icon } from "@iconify-icon/react";
import MuxPlayer from "@mux/mux-player-react";

interface VideoThumbnailProps {
  playbackId: string;
  className?: string;
  onPlay?: () => void;
}

export function VideoThumbnail({
  playbackId,
  className,
  onPlay,
}: VideoThumbnailProps) {
  return (
    <div className={cn("relative w-full h-full overflow-hidden group cursor-pointer", className)} onClick={onPlay}>
      {/* Static thumbnail from Mux */}
      <MuxPlayer
        playbackId={playbackId}
        muted
        playsInline
        className="w-full h-full object-cover pointer-events-none"
        style={{
          "--controls": "none",
          aspectRatio: "16/9",
        } as React.CSSProperties}
      />

      {/* Overlay with play button */}
      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay?.();
          }}
          className={cn(
            "size-16 rounded-full bg-white/90 backdrop-blur-sm",
            "flex items-center justify-center",
            "hover:bg-white hover:scale-110 transition-all duration-200",
            "shadow-xl",
          )}
          aria-label="Play video"
        >
          <Icon icon="mdi:play" className="text-4xl text-stone-700 ml-1" />
        </button>
      </div>
    </div>
  );
}
