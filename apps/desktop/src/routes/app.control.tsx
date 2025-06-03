import { createFileRoute } from "@tanstack/react-router";
import { emit } from "@tauri-apps/api/event";
import { Circle, Grip, Mic, MicOff, Square, Volume2, VolumeX } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { commands as listenerCommands, events as listenerEvents } from "@hypr/plugin-listener";
import { commands as windowsCommands } from "@hypr/plugin-windows";

export const Route = createFileRoute("/app/control")({
  component: Component,
});

function Component() {
  const [position, setPosition] = useState(() => {
    const savedPosition = localStorage.getItem("floating-control-position");
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition);
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        if (
          parsed.x >= 0 && parsed.x <= windowWidth - 200
          && parsed.y >= 0 && parsed.y <= windowHeight - 100
        ) {
          return parsed;
        }
      } catch (e) {
        console.warn("Failed to parse saved position:", e);
      }
    }

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const initialX = (windowWidth - 200) / 2;
    const initialY = (windowHeight - 200) / 2;

    return { x: initialX, y: initialY };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Use refs to store current values for event handlers
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Interaction tracking (lifted to component scope)
  const lastInteractionRef = React.useRef(Date.now());
  const trackInteraction = React.useCallback(() => {
    lastInteractionRef.current = Date.now();
  }, []);

  // Update refs whenever state changes
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    dragOffsetRef.current = dragOffset;
  }, [dragOffset]);

  // Recording state from listener plugin
  const [recordingStatus, setRecordingStatus] = useState<"inactive" | "running_active" | "running_paused">("inactive");
  const [recordingLoading, setRecordingLoading] = useState(false);

  // Audio controls state
  const [micMuted, setMicMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);

  const isRecording = recordingStatus !== "inactive";
  const isRecordingActive = recordingStatus === "running_active";
  const isRecordingPaused = recordingStatus === "running_paused";

  // Load initial recording state and listen for changes
  useEffect(() => {
    const initializeState = async () => {
      try {
        // Get initial state from listener plugin
        const currentState = await listenerCommands.getState();
        console.log(`[Control Bar] Initial state: ${currentState}`);

        if (currentState === "running_active" || currentState === "running_paused" || currentState === "inactive") {
          setRecordingStatus(currentState as any);
        }

        // Get initial audio state
        const [initialMicMuted, initialSpeakerMuted] = await Promise.all([
          listenerCommands.getMicMuted(),
          listenerCommands.getSpeakerMuted(),
        ]);
        setMicMuted(initialMicMuted);
        setSpeakerMuted(initialSpeakerMuted);
      } catch (error) {
        console.error("[Control Bar] Failed to load initial state:", error);
      }
    };

    initializeState();

    const unsubscribeSession = listenerEvents.sessionEvent.listen(({ payload }) => {
      if (payload.type === "inactive" || payload.type === "running_active" || payload.type === "running_paused") {
        setRecordingStatus(payload.type);
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

  // Debug logging
  useEffect(() => {
    console.log(
      `[Control Bar Debug] Recording status: ${recordingStatus}, isRecording: ${isRecording}, isRecordingActive: ${isRecordingActive}`,
    );
  }, [recordingStatus, isRecording, isRecordingActive]);

  const controlRef = useRef<HTMLDivElement | null>(null) as React.MutableRefObject<HTMLDivElement | null>;
  const toolbarRef = useRef<HTMLDivElement>(null);
  const boundsUpdateTimeoutRef = useRef<number | null>(null);

  const setControlRef = (el: HTMLDivElement | null) => {
    if (el) {
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        const actualPosition = { x: rect.left, y: rect.top };

        const threshold = 10;
        if (
          Math.abs(actualPosition.x - position.x) > threshold
          || Math.abs(actualPosition.y - position.y) > threshold
        ) {
          setPosition(actualPosition);
        }
      }, 50);
    }
    controlRef.current = el;
  };

  const updateOverlayBounds = async () => {
    if (toolbarRef.current) {
      const toolbarRect = toolbarRef.current.getBoundingClientRect();

      let bounds = {
        x: position.x,
        y: position.y,
        width: toolbarRect.width,
        height: toolbarRect.height,
      };

      emit("debug", `Toolbar position: ${JSON.stringify(position)}`);
      emit(
        "debug",
        `Toolbar rect: ${
          JSON.stringify({ x: toolbarRect.x, y: toolbarRect.y, width: toolbarRect.width, height: toolbarRect.height })
        }`,
      );
      emit("debug", `Setting overlay bounds: ${JSON.stringify(bounds)}`);
      emit("debug", `Window dimensions: ${JSON.stringify({ width: window.innerWidth, height: window.innerHeight })}`);

      try {
        await windowsCommands.setFakeWindowBounds("control", bounds);
      } catch (error) {
        console.error("Failed to set fake window bounds:", error);
      }
    }
  };

  // Debounced version to prevent excessive bounds updates
  const debouncedUpdateBounds = () => {
    if (boundsUpdateTimeoutRef.current) {
      clearTimeout(boundsUpdateTimeoutRef.current);
    }
    boundsUpdateTimeoutRef.current = window.setTimeout(() => {
      updateOverlayBounds();
      boundsUpdateTimeoutRef.current = null;
    }, 100); // Increased debounce delay to 100ms for better stability
  };

  const handleToolbarClick = (e: React.MouseEvent) => {
    // Don't stop propagation to allow drag events to work properly
  };

  useEffect(() => {
    // Immediately set transparent background to prevent white flash
    document.body.style.background = "transparent";
    document.body.style.backgroundColor = "transparent";
    document.documentElement.style.background = "transparent";
    document.documentElement.style.backgroundColor = "transparent";
    document.documentElement.setAttribute("data-transparent-window", "true");

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) {
        return;
      }

      // Get toolbar dimensions for clamping
      const toolbarWidth = toolbarRef.current?.getBoundingClientRect().width || 200;
      const toolbarHeight = toolbarRef.current?.getBoundingClientRect().height || 60;

      // Clamp position to keep toolbar on screen
      const clampedX = Math.max(0, Math.min(window.innerWidth - toolbarWidth, e.clientX - dragOffsetRef.current.x));
      const clampedY = Math.max(0, Math.min(window.innerHeight - toolbarHeight, e.clientY - dragOffsetRef.current.y));

      const newPosition = {
        x: clampedX,
        y: clampedY,
      };

      setPosition(newPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Force bounds update after drag completes
      setTimeout(() => {
        updateOverlayBounds();
      }, 50);
    };

    // Handle desktop switching and window focus changes on Mac
    const handleWindowFocus = () => {
      // Smart recovery on focus - only aggressive if needed
      smartRecovery();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Smart recovery on visibility change
        smartRecovery();
      }
    };

    const handleWindowResize = () => {
      debouncedUpdateBounds();
    };

    const smartRecovery = () => {
      const timeSinceInteraction = Date.now() - lastInteractionRef.current;
      if (timeSinceInteraction > 10000) { // 10 seconds of no interaction
        windowsCommands.removeFakeWindow("control").then(() => {
          setTimeout(updateOverlayBounds, 100);
        }).catch(console.error);
      } else {
        // Just do a simple bounds update
        updateOverlayBounds();
      }
      trackInteraction();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("resize", handleWindowResize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Initial bounds setup - use longer delay to ensure DOM is ready and position is loaded
    setTimeout(() => {
      updateOverlayBounds();
    }, 200);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("resize", handleWindowResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (boundsUpdateTimeoutRef.current) {
        clearTimeout(boundsUpdateTimeoutRef.current);
      }
      windowsCommands.removeFakeWindow("control");
    };
  }, []); // Remove dependencies to prevent re-creating event listeners

  useEffect(() => {
    // Update bounds whenever position changes (safety mechanism)
    debouncedUpdateBounds();

    // Save position to localStorage for persistence across window recreations
    localStorage.setItem("floating-control-position", JSON.stringify(position));
  }, [position]);

  // Effect to detect and sync to actual rendered position (handles window recreation)
  useEffect(() => {
    const detectActualPosition = () => {
      if (controlRef.current) {
        const rect = controlRef.current.getBoundingClientRect();
        const actualPosition = { x: rect.left, y: rect.top };

        // If there's a significant difference, sync React state to actual position
        const threshold = 10; // pixels
        if (
          Math.abs(actualPosition.x - position.x) > threshold
          || Math.abs(actualPosition.y - position.y) > threshold
        ) {
          setPosition(actualPosition);
        } else {
          // Positions match, just update bounds
          updateOverlayBounds();
        }
      }
    };

    // Multiple attempts to catch the actual position
    const timers = [100, 200, 500].map(delay => setTimeout(detectActualPosition, delay));

    return () => timers.forEach(clearTimeout);
  }, []); // Only run once on mount

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

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
        // Create a new session and start recording
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
      // Emit event to synchronize with other windows
      await emit("audio-mic-state-changed", { muted: newMuted });
      console.log(`[Control Bar] ${newMuted ? "Muted" : "Unmuted"} microphone`);
    } catch (error) {
      console.error("[Control Bar] Mic toggle error:", error);
    }
  };

  const toggleSpeaker = async () => {
    try {
      const newMuted = !speakerMuted;
      await listenerCommands.setSpeakerMuted(newMuted);
      setSpeakerMuted(newMuted);
      // Emit event to synchronize with other windows
      await emit("audio-speaker-state-changed", { muted: newMuted });
      console.log(`[Control Bar] ${newMuted ? "Muted" : "Unmuted"} speaker`);
    } catch (error) {
      console.error("[Control Bar] Speaker toggle error:", error);
    }
  };

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
          onClick={handleToolbarClick}
          onMouseEnter={() => {
            // Lightweight hover recovery
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
            {/* Section 1: Mic + Speaker */}
            <div className="flex gap-1 items-center">
              <IconButton
                onClick={toggleMic}
                tooltip={micMuted ? "Unmute Microphone" : "Mute Microphone"}
                className={micMuted ? "bg-red-500/60 hover:bg-red-500/80" : "bg-gray-700/60 hover:bg-gray-600/80"}
              >
                {micMuted ? <MicOff size={16} /> : <Mic size={16} />}
              </IconButton>

              <IconButton
                onClick={toggleSpeaker}
                tooltip={speakerMuted ? "Unmute Speaker" : "Mute Speaker"}
                className={speakerMuted ? "bg-red-500/60 hover:bg-red-500/80" : "bg-gray-700/60 hover:bg-gray-600/80"}
              >
                {speakerMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </IconButton>
            </div>

            <div className="w-px h-6 bg-white/20 mx-1" />

            {/* Section 2: Pause + Stop */}
            <div className="flex gap-1 items-center">
              {/* Pause/Resume Button */}
              {isRecording && (
                <IconButton
                  onClick={isRecordingActive ? pauseRecording : toggleRecording}
                  tooltip={isRecordingActive ? "Pause Recording" : "Resume Recording"}
                  className={isRecordingActive
                    ? "bg-amber-600/60 hover:bg-amber-500/80"
                    : "bg-green-600/60 hover:bg-green-500/80"}
                  disabled={recordingLoading}
                >
                  {recordingLoading
                    ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    : isRecordingActive
                    ? (
                      <div className="flex gap-0.5">
                        <div className="w-1 h-3 bg-white rounded-sm" />
                        <div className="w-1 h-3 bg-white rounded-sm" />
                      </div>
                    )
                    : <Circle size={16} />}
                </IconButton>
              )}

              {/* Stop/Start Button */}
              <IconButton
                onClick={toggleRecording}
                tooltip={isRecording ? "Stop Recording" : "Start Recording"}
                className={isRecording
                  ? "bg-red-600/70 hover:bg-red-500/90 shadow-lg shadow-red-500/30"
                  : "bg-gray-700/60 hover:bg-gray-600/80"}
                disabled={recordingLoading}
              >
                {recordingLoading
                  ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  : isRecording
                  ? <Square size={16} />
                  : <Circle size={16} />}
              </IconButton>
            </div>

            <div className="w-px h-6 bg-white/20 mx-1" />

            <div className="flex gap-1 items-center">
              <div
                className="ml-1 p-1.5 text-white/60 cursor-move hover:text-white/90 hover:bg-gray-600/40 rounded-lg transition-all duration-200"
                onMouseDown={handleMouseDown}
                title="Drag to move"
                style={{ userSelect: "none" }}
              >
                <Grip size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconButton({ onClick, children, className = "", tooltip = "", disabled = false }: {
  onClick?: ((e: React.MouseEvent<HTMLButtonElement>) => void) | (() => void);
  children: React.ReactNode;
  className?: string;
  tooltip?: string;
  disabled?: boolean;
}) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent button clicks from triggering drag
    if (!disabled) {
      onClick?.(e);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`p-2 bg-gray-800/50 backdrop-blur-sm rounded-xl text-white shadow-lg hover:bg-gray-700/60 active:bg-gray-600/70 transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600/30 hover:border-gray-500/40 ${className}`}
      title={tooltip}
      aria-label={tooltip}
    >
      {children}
    </button>
  );
}
