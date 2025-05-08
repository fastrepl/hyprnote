import { createFileRoute } from "@tanstack/react-router";
import { Camera, Circle, Grip, Settings, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows";

export const Route = createFileRoute("/app/control")({
  component: Component,
});

function Component() {
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isRecording, setIsRecording] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);

  const updateOverlayBounds = () => {
    if (controlRef.current) {
      const rect = controlRef.current.getBoundingClientRect();
      windowsCommands.windowSetOverlayBounds("control-overlay", {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }
  };

  useEffect(() => {
    document.body.style.background = "transparent";
    document.documentElement.setAttribute("data-transparent-window", "true");

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    updateOverlayBounds();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      windowsCommands.windowRemoveOverlayBounds("control-overlay");
    };
  }, [isDragging, dragOffset]);

  useEffect(() => {
    updateOverlayBounds();
  }, [position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const captureScreenshot = () => {
    console.log("Capture screenshot");
    setTimeout(updateOverlayBounds, 0);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    console.log(isRecording ? "Stop recording" : "Start recording");
    setTimeout(updateOverlayBounds, 0);
  };

  const openSettings = () => {
    console.log("Open settings");
    setTimeout(updateOverlayBounds, 0);
  };

  return (
    <div
      className="w-screen h-[100vh] bg-transparent relative overflow-y-hidden"
      style={{ scrollbarColor: "auto transparent" }}
    >
      <div
        className="absolute"
        style={{
          left: position.x,
          top: position.y,
          transition: isDragging ? "none" : "all 0.1s ease",
        }}
        ref={controlRef}
      >
        <div
          className="bg-black/10 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg cursor-move flex items-center justify-center transition-all duration-200 p-2"
          onMouseDown={handleMouseDown}
        >
          <div className="flex gap-2 items-center">
            <IconButton onClick={captureScreenshot} tooltip="Take Screenshot">
              <Camera size={16} />
            </IconButton>
            <IconButton
              onClick={toggleRecording}
              tooltip={isRecording ? "Stop Recording" : "Start Recording"}
              className={isRecording ? "bg-red-500/50 hover:bg-red-500/70" : ""}
            >
              {isRecording ? <Square size={16} /> : <Circle size={16} />}
            </IconButton>
            <IconButton onClick={openSettings} tooltip="Settings">
              <Settings size={16} />
            </IconButton>
            <div
              className="ml-1 text-white/50 cursor-move"
              onMouseDown={handleMouseDown}
            >
              <Grip size={16} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconButton({ onClick, children, className = "", tooltip = "" }: {
  onClick?: ((e: React.MouseEvent<HTMLButtonElement>) => void) | (() => void);
  children: React.ReactNode;
  className?: string;
  tooltip?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs shadow-md hover:bg-white/30 transition-colors duration-200 flex items-center justify-center ${className}`}
      title={tooltip}
    >
      {children}
    </button>
  );
}
