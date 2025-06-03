import { createFileRoute } from "@tanstack/react-router";
import { emit } from "@tauri-apps/api/event";
import { Circle, Grip, Mic, MicOff, Square, Volume2, VolumeX } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { commands as listenerCommands, events as listenerEvents } from "@hypr/plugin-listener";
import { commands as windowsCommands } from "@hypr/plugin-windows";

export const Route = createFileRoute("/app/control")({
  component: Component,
});

function Component() {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement | null>(null);

  const {
    position,
    isDragging,
    handleDragStart,
    syncActualPosition,
    updateOverlayBounds,
    trackInteraction,
  } = useFloatingPosition(toolbarRef);

  const {
    recordingLoading,
    micMuted,
    speakerMuted,
    isRecording,
    isRecordingActive,
    toggleRecording,
    pauseRecording,
    toggleMic,
    toggleSpeaker,
  } = useRecordingState();

  useEffect(() => {
    document.body.style.background = "transparent";
    document.body.style.backgroundColor = "transparent";
    document.documentElement.style.background = "transparent";
    document.documentElement.style.backgroundColor = "transparent";
    document.documentElement.setAttribute("data-transparent-window", "true");
  }, []);

  const setControlRef = useCallback((el: HTMLDivElement | null) => {
    controlRef.current = el;
    syncActualPosition(el);
  }, [syncActualPosition]);

  return (
    <div
      className="w-screen h-[100vh] relative overflow-y-hidden"
      style={{
        scrollbarColor: "auto transparent",
        background: "transparent",
        backgroundColor: "transparent",
      }}
    >
      <div
        className="absolute"
        style={{
          left: position.x,
          top: position.y,
          transition: isDragging ? "none" : "all 0.1s ease",
        }}
        ref={setControlRef}
      >
        <div
          className="rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-200 p-3"
          ref={toolbarRef}
          onMouseEnter={() => {
            trackInteraction();
            updateOverlayBounds();
          }}
          style={{
            pointerEvents: "auto",
            background: "rgba(0, 0, 0, 0.85)",
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.6)",
          }}
        >
          <div className="flex gap-2 items-center">
            <img
              src="/icons/logo.png"
              alt="Logo"
              className="size-8"
            />

            <AudioControls
              micMuted={micMuted}
              speakerMuted={speakerMuted}
              onToggleMic={toggleMic}
              onToggleSpeaker={toggleSpeaker}
            />

            <Divider />

            <RecordingControls
              isRecording={isRecording}
              isRecordingActive={isRecordingActive}
              recordingLoading={recordingLoading}
              onToggleRecording={toggleRecording}
              onPauseRecording={pauseRecording}
            />

            <Divider />

            <DragHandle onMouseDown={handleDragStart} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AudioControls({
  micMuted,
  speakerMuted,
  onToggleMic,
  onToggleSpeaker,
}: {
  micMuted: boolean;
  speakerMuted: boolean;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
}) {
  return (
    <div className="flex gap-1 items-center">
      <IconButton
        onClick={onToggleMic}
        tooltip={micMuted ? "Unmute Microphone" : "Mute Microphone"}
        className={micMuted ? "bg-red-500/60 hover:bg-red-500/80" : "bg-gray-700/60 hover:bg-gray-600/80"}
      >
        {micMuted ? <MicOff size={16} /> : <Mic size={16} />}
      </IconButton>

      <IconButton
        onClick={onToggleSpeaker}
        tooltip={speakerMuted ? "Unmute Speaker" : "Mute Speaker"}
        className={speakerMuted ? "bg-red-500/60 hover:bg-red-500/80" : "bg-gray-700/60 hover:bg-gray-600/80"}
      >
        {speakerMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </IconButton>
    </div>
  );
}

function RecordingControls({
  isRecording,
  isRecordingActive,
  recordingLoading,
  onToggleRecording,
  onPauseRecording,
}: {
  isRecording: boolean;
  isRecordingActive: boolean;
  recordingLoading: boolean;
  onToggleRecording: () => void;
  onPauseRecording: () => void;
}) {
  return (
    <div className="flex gap-1 items-center">
      {isRecording && (
        <IconButton
          onClick={isRecordingActive ? onPauseRecording : onToggleRecording}
          tooltip={isRecordingActive ? "Pause Recording" : "Resume Recording"}
          className={isRecordingActive
            ? "bg-amber-600/60 hover:bg-amber-500/80"
            : "bg-green-600/60 hover:bg-green-500/80"}
          disabled={recordingLoading}
        >
          {recordingLoading ? <LoadingSpinner /> : isRecordingActive ? <PauseIcon /> : <Circle size={16} />}
        </IconButton>
      )}

      <IconButton
        onClick={onToggleRecording}
        tooltip={isRecording ? "Stop Recording" : "Start Recording"}
        className={isRecording
          ? "bg-red-600/70 hover:bg-red-500/90 shadow-lg shadow-red-500/30"
          : "bg-gray-700/60 hover:bg-gray-600/80"}
        disabled={recordingLoading}
      >
        {recordingLoading ? <LoadingSpinner /> : isRecording ? <Square size={16} /> : <Circle size={16} />}
      </IconButton>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-white/20 mx-1" />;
}

function DragHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div className="flex gap-1 items-center">
      <div
        className="ml-1 p-1.5 text-white/60 cursor-move hover:text-white/90 hover:bg-gray-600/40 rounded-lg transition-all duration-200"
        onMouseDown={onMouseDown}
        title="Drag to move"
        style={{ userSelect: "none" }}
      >
        <Grip size={16} />
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />;
}

function PauseIcon() {
  return (
    <div className="flex gap-0.5">
      <div className="w-1 h-3 bg-white rounded-sm" />
      <div className="w-1 h-3 bg-white rounded-sm" />
    </div>
  );
}

function IconButton({
  onClick,
  children,
  className = "",
  tooltip = "",
  disabled = false,
}: {
  onClick?: ((e: React.MouseEvent<HTMLButtonElement>) => void) | (() => void);
  children: React.ReactNode;
  className?: string;
  tooltip?: string;
  disabled?: boolean;
}) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!disabled) {
      onClick?.(e);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        p-2 bg-gray-800/50 backdrop-blur-sm rounded-xl text-white shadow-lg 
        hover:bg-gray-700/60 active:bg-gray-600/70 transition-all duration-200 
        flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed 
        border border-gray-600/30 hover:border-gray-500/40 ${className}
      `}
      title={tooltip}
      aria-label={tooltip}
    >
      {children}
    </button>
  );
}

function useFloatingPosition(toolbarRef: React.RefObject<HTMLDivElement>) {
  const STORAGE_KEY = "floating-control-position";
  const POSITION_SYNC_DELAY = 100;
  const BOUNDS_UPDATE_DELAY = 100;

  const isInitialMountRef = useRef(true);
  const hasRestoredPositionRef = useRef(false);

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const savedPosition = localStorage.getItem(STORAGE_KEY);

    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition);
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        const margin = 50;

        if (
          parsed.x >= 0
          && parsed.x <= windowWidth - margin
          && parsed.y >= 0
          && parsed.y <= windowHeight - margin
        ) {
          hasRestoredPositionRef.current = true;
          return parsed;
        }
      } catch (e) {
        console.warn("Failed to parse saved position:", e);
      }
    }

    return {
      x: (window.innerWidth - 200) / 2,
      y: (window.innerHeight - 200) / 2,
    };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const boundsUpdateTimeoutRef = useRef<number | null>(null);
  const lastInteractionRef = useRef(Date.now());

  const updateOverlayBounds = useCallback(async () => {
    if (!toolbarRef.current) {
      return;
    }

    const toolbarRect = toolbarRef.current.getBoundingClientRect();
    const bounds = {
      x: position.x,
      y: position.y,
      width: toolbarRect.width,
      height: toolbarRect.height,
    };

    try {
      await windowsCommands.setFakeWindowBounds("control", bounds);
    } catch (error) {
      console.error("Failed to set fake window bounds:", error);
    }
  }, [position, toolbarRef]);

  const debouncedUpdateBounds = useCallback(() => {
    if (boundsUpdateTimeoutRef.current) {
      clearTimeout(boundsUpdateTimeoutRef.current);
    }
    boundsUpdateTimeoutRef.current = window.setTimeout(() => {
      updateOverlayBounds();
      boundsUpdateTimeoutRef.current = null;
    }, BOUNDS_UPDATE_DELAY);
  }, [updateOverlayBounds]);

  const trackInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now();
  }, []);

  const smartRecovery = useCallback(() => {
    const timeSinceInteraction = Date.now() - lastInteractionRef.current;
    if (timeSinceInteraction > 10000) {
      windowsCommands.removeFakeWindow("control")
        .then(() => setTimeout(updateOverlayBounds, POSITION_SYNC_DELAY))
        .catch(console.error);
    } else {
      updateOverlayBounds();
    }
    trackInteraction();
  }, [updateOverlayBounds, trackInteraction]);

  const syncActualPosition = useCallback((element: HTMLDivElement | null) => {
    if (!element) {
      return;
    }

    if (isInitialMountRef.current && hasRestoredPositionRef.current) {
      isInitialMountRef.current = false;
      setTimeout(() => {
        updateOverlayBounds();
      }, POSITION_SYNC_DELAY * 2);
      return;
    }

    setTimeout(() => {
      const rect = element.getBoundingClientRect();
      const actualPosition = { x: rect.left, y: rect.top };
      const threshold = 10;

      if (
        Math.abs(actualPosition.x - position.x) > threshold
        || Math.abs(actualPosition.y - position.y) > threshold
      ) {
        setPosition(actualPosition);
      }
    }, POSITION_SYNC_DELAY);
  }, [position, updateOverlayBounds]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    isInitialMountRef.current = false;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
    trackInteraction();
  }, [position, trackInteraction]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    debouncedUpdateBounds();
  }, [position, debouncedUpdateBounds]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) {
        return;
      }

      const toolbarWidth = toolbarRef.current?.getBoundingClientRect().width || 200;
      const toolbarHeight = toolbarRef.current?.getBoundingClientRect().height || 60;

      const clampedX = Math.max(0, Math.min(window.innerWidth - toolbarWidth, e.clientX - dragOffset.x));
      const clampedY = Math.max(0, Math.min(window.innerHeight - toolbarHeight, e.clientY - dragOffset.y));

      setPosition({ x: clampedX, y: clampedY });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setTimeout(updateOverlayBounds, 50);
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, toolbarRef, updateOverlayBounds]);

  useEffect(() => {
    const handleWindowFocus = () => smartRecovery();
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        smartRecovery();
      }
    };
    const handleWindowResize = () => debouncedUpdateBounds();

    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("resize", handleWindowResize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    setTimeout(updateOverlayBounds, 200);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("resize", handleWindowResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (boundsUpdateTimeoutRef.current) {
        clearTimeout(boundsUpdateTimeoutRef.current);
      }

      windowsCommands.removeFakeWindow("control");
    };
  }, [smartRecovery, debouncedUpdateBounds, updateOverlayBounds]);

  return {
    position,
    isDragging,
    handleDragStart,
    syncActualPosition,
    updateOverlayBounds,
    trackInteraction,
  };
}

function useRecordingState() {
  const [recordingStatus, setRecordingStatus] = useState<"inactive" | "running_active" | "running_paused">("inactive");
  const [recordingLoading, setRecordingLoading] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);

  const isRecording = recordingStatus !== "inactive";
  const isRecordingActive = recordingStatus === "running_active";
  const isRecordingPaused = recordingStatus === "running_paused";

  useEffect(() => {
    const initializeState = async () => {
      try {
        const [currentState, initialMicMuted, initialSpeakerMuted] = await Promise.all([
          listenerCommands.getState(),
          listenerCommands.getMicMuted(),
          listenerCommands.getSpeakerMuted(),
        ]);

        if (["running_active", "running_paused", "inactive"].includes(currentState)) {
          setRecordingStatus(currentState as any);
        }

        setMicMuted(initialMicMuted);
        setSpeakerMuted(initialSpeakerMuted);
      } catch (error) {
        console.error("[Control Bar] Failed to load initial state:", error);
      }
    };

    initializeState();

    const unsubscribeSession = listenerEvents.sessionEvent.listen(({ payload }) => {
      if (["inactive", "running_active", "running_paused"].includes(payload.type)) {
        setRecordingStatus(payload.type as any);
        setRecordingLoading(false);
      }

      if (payload.type === "micMuted") {
        setMicMuted(payload.value);
      }

      if (payload.type === "speakerMuted") {
        setSpeakerMuted(payload.value);
      }
    });

    return () => {
      unsubscribeSession.then(unlisten => unlisten());
    };
  }, []);

  const toggleRecording = async () => {
    try {
      setRecordingLoading(true);

      if (isRecording) {
        if (isRecordingActive) {
          await listenerCommands.stopSession();
        } else if (isRecordingPaused) {
          await listenerCommands.resumeSession();
        }
      } else {
        const newSessionId = `control-session-${Date.now()}`;
        await listenerCommands.startSession(newSessionId);
      }
    } catch (error) {
      console.error("[Control Bar] Recording error:", error);
    } finally {
      setRecordingLoading(false);
    }
  };

  const pauseRecording = async () => {
    try {
      setRecordingLoading(true);
      if (isRecordingActive) {
        await listenerCommands.pauseSession();
      }
    } catch (error) {
      console.error("[Control Bar] Pause error:", error);
    } finally {
      setRecordingLoading(false);
    }
  };

  const toggleMic = async () => {
    try {
      const newMuted = !micMuted;
      await listenerCommands.setMicMuted(newMuted);
      setMicMuted(newMuted);
      await emit("audio-mic-state-changed", { muted: newMuted });
    } catch (error) {
      console.error("[Control Bar] Mic toggle error:", error);
    }
  };

  const toggleSpeaker = async () => {
    try {
      const newMuted = !speakerMuted;
      await listenerCommands.setSpeakerMuted(newMuted);
      setSpeakerMuted(newMuted);
      await emit("audio-speaker-state-changed", { muted: newMuted });
    } catch (error) {
      console.error("[Control Bar] Speaker toggle error:", error);
    }
  };

  return {
    recordingStatus,
    recordingLoading,
    micMuted,
    speakerMuted,
    isRecording,
    isRecordingActive,
    isRecordingPaused,
    toggleRecording,
    pauseRecording,
    toggleMic,
    toggleSpeaker,
  };
}
