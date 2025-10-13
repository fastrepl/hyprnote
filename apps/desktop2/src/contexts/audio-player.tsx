import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface AudioPlayerContextValue {
  registerContainer: (el: HTMLDivElement | null) => void;
  wavesurfer: WaveSurfer | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function useAudioPlayerContext() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayerContext must be used within AudioPlayerProvider");
  }
  return context;
}

interface AudioPlayerProviderProps {
  children: ReactNode;
  url: string;
}

export function AudioPlayerProvider({ children, url }: AudioPlayerProviderProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const registerContainer = (el: HTMLDivElement | null) => {
    setContainer(el);
  };

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

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    ws.on("ready", handleReady);
    ws.on("decode", handleDecode);
    ws.on("audioprocess", handleAudioprocess);
    ws.on("play", handlePlay);
    ws.on("pause", handlePause);

    setWavesurfer(ws);

    return () => {
      ws.destroy();
      setWavesurfer(null);
    };
  }, [container, url]);

  const togglePlay = useCallback(() => {
    wavesurfer?.playPause();
  }, [wavesurfer]);

  const play = useCallback(() => {
    wavesurfer?.play();
  }, [wavesurfer]);

  const pause = useCallback(() => {
    wavesurfer?.pause();
  }, [wavesurfer]);

  return (
    <AudioPlayerContext.Provider
      value={{
        registerContainer,
        wavesurfer,
        isPlaying,
        currentTime,
        duration,
        togglePlay,
        play,
        pause,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}
