import { useState, useEffect } from "react";
import { RiPlayFill, RiPauseFill } from "@remixicon/react";

export const AudioControls = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [audio] = useState(new Audio("/bgm.mp3"));

  useEffect(() => {
    audio.loop = true;
    audio.play().catch((error) => console.log("Audio autoplay failed:", error));

    // Set up media session
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: "Hypr Background Music",
        artist: "Hypr",
        album: "Hypr App",
      });

      navigator.mediaSession.setActionHandler("play", () => {
        setIsPlaying(true);
        audio.play();
      });

      navigator.mediaSession.setActionHandler("pause", () => {
        setIsPlaying(false);
        audio.pause();
      });
    }

    return () => {
      audio.pause();
      audio.currentTime = 0;

      // Clean up media session handlers
      if ("mediaSession" in navigator) {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
      }
    };
  }, [audio]);

  useEffect(() => {
    if (isPlaying) {
      audio.play().catch((error) => console.log("Audio play failed:", error));
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
      }
    } else {
      audio.pause();
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
    }
  }, [isPlaying, audio]);

  return (
    <div className="fixed right-5 top-5 z-10">
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="rounded-full bg-black p-2 transition-colors duration-200 hover:bg-black/70"
      >
        {isPlaying ? <RiPauseFill size={24} /> : <RiPlayFill size={24} />}
      </button>
    </div>
  );
};
