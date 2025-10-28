import { cn } from "@hypr/utils";
import MuxPlayer, { type MuxPlayerRefAttributes } from "@mux/mux-player-react";
import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  playbackId: string;
  className?: string;
  onLearnMore?: () => void;
  showButtons?: boolean;
  onExpandVideo?: () => void;
}

export function VideoPlayer({
  playbackId,
  className,
  onLearnMore,
  showButtons = true,
  onExpandVideo,
}: VideoPlayerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const playerRef = useRef<MuxPlayerRefAttributes>(null);

  useEffect(() => {
    if (playerRef.current) {
      if (isHovered) {
        playerRef.current.play().catch(() => {
          // Ignore autoplay errors
        });
        setShowControls(true);
      } else {
        playerRef.current.pause();
        playerRef.current.currentTime = 0;
        setShowControls(false);
      }
    }
  }, [isHovered]);

  return (
    <div
      className={cn(["relative w-full h-full overflow-hidden group", className])}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <MuxPlayer
        ref={playerRef}
        playbackId={playbackId}
        loop
        muted
        playsInline
        accentColor="#78716c"
        className="w-full h-full object-cover"
        style={{
          "--controls": "none",
          aspectRatio: "16/9",
        } as React.CSSProperties}
      />

      {/* Buttons overlay - slide up from bottom */}
      {showButtons && showControls && (
        <div
          className={cn(
            [
              "absolute bottom-0 left-0 right-0",
              "transition-all duration-300 ease-out",
              "flex gap-0",
              isHovered ? "translate-y-0 opacity-100" : "translate-y-full opacity-0",
            ],
          )}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLearnMore?.();
            }}
            className={cn([
              "flex-1 py-4 text-xs font-mono",
              "bg-stone-100/95 text-stone-800",
              "border-r border-stone-400/50",
              "hover:bg-stone-200/95 active:bg-stone-400/95",
              "transition-all duration-150",
              "backdrop-blur-sm",
            ])}
          >
            Learn more
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpandVideo?.();
            }}
            className={cn([
              "flex-1 py-4 text-xs font-mono",
              "bg-stone-100/95 text-stone-800",
              "hover:bg-stone-200/95 active:bg-stone-400/95",
              "transition-all duration-150",
              "backdrop-blur-sm",
            ])}
          >
            Expand video
          </button>
        </div>
      )}
    </div>
  );
}
