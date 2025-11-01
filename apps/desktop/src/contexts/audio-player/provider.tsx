import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import WaveSurfer from "wavesurfer.js";

type AudioPlayerState = "playing" | "paused" | "stopped";

interface AudioPlayerContextValue {
  registerContainer: (el: HTMLDivElement | null) => void;
  wavesurfer: WaveSurfer | null;
  state: AudioPlayerState;
  time: { current: number; total: number };
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  }
  return context;
}

export function AudioPlayerProvider({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
  const [state, setState] = useState<AudioPlayerState>("stopped");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const registerContainer = useCallback((el: HTMLDivElement | null) => {
    setContainer((prev) => (prev === el ? prev : el));
  }, []);

  useEffect(() => {
    if (!container) {
      return;
    }

    const ws = WaveSurfer.create({
      container,
      height: 30,
      waveColor: "#d4d4d8",
      progressColor: "#52525b",
      cursorColor: "#18181b",
      cursorWidth: 2,
      barWidth: 3,
      barGap: 2,
      barRadius: 2,
      barHeight: 1,
      url,
      dragToSeek: true,
      normalize: true,
    });

    const handleReady = () => {
      setDuration(ws.getDuration());
    };

    const handleDecode = () => {
      setDuration(ws.getDuration());
    };

    const handleAudioprocess = () => {
      setCurrentTime(ws.getCurrentTime());
    };

    const handleTimeupdate = () => {
      setCurrentTime(ws.getCurrentTime());
    };

    const handleDestroy = () => {
      setState("stopped");
    };

    ws.on("ready", handleReady);
    ws.on("decode", handleDecode);
    ws.on("audioprocess", handleAudioprocess);
    ws.on("timeupdate", handleTimeupdate);

    // Listening to the "pause" event is problematic. Not sure why, but it is even called when I stop the player.
    ws.on("destroy", handleDestroy);

    setWavesurfer(ws);

    return () => {
      ws.destroy();
      setWavesurfer(null);
    };
  }, [container, url]);

  const start = useCallback(() => {
    if (wavesurfer) {
      wavesurfer.play();
      setState("playing");
    }
  }, [wavesurfer]);

  const pause = useCallback(() => {
    if (wavesurfer) {
      wavesurfer.pause();
      setState("paused");
    }
  }, [wavesurfer]);

  const resume = useCallback(() => {
    if (wavesurfer) {
      wavesurfer.play();
      setState("playing");
    }
  }, [wavesurfer]);

  const stop = useCallback(() => {
    if (wavesurfer) {
      wavesurfer.stop();
      setState("stopped");
    }
  }, [wavesurfer]);

  return (
    <AudioPlayerContext.Provider
      value={{
        registerContainer,
        wavesurfer,
        state,
        time: { current: currentTime, total: duration },
        start,
        pause,
        resume,
        stop,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}
