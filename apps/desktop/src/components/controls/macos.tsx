// https://github.com/agmmnn/tauri-controls/blob/f3592f0/apps/tauri-controls/src/tauri-controls/controls/macos.tsx

import { useEffect, useState, type HTMLProps } from "react";

import { useWindow } from "@/contexts/window";
import { cn } from "@/utils";

import { Icons } from "./icons";
import { Button } from "./button";

export function MacOS({ className, ...props }: HTMLProps<HTMLDivElement>) {
  const { minimizeWindow, maximizeWindow, fullscreenWindow, closeWindow } =
    useWindow();

  const [isAltKeyPressed, setIsAltKeyPressed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const last = isAltKeyPressed ? <Icons.plusMac /> : <Icons.fullMac />;
  const key = "Alt";

  const handleMouseEnter = () => {
    setIsHovering(true);
  };
  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const handleAltKeyDown = (e: KeyboardEvent) => {
    if (e.key === key) {
      setIsAltKeyPressed(true);
    }
  };
  const handleAltKeyUp = (e: KeyboardEvent) => {
    if (e.key === key) {
      setIsAltKeyPressed(false);
    }
  };
  useEffect(() => {
    // Attach event listeners when the component mounts
    window.addEventListener("keydown", handleAltKeyDown);
    window.addEventListener("keyup", handleAltKeyUp);
  }, []);

  return (
    <div
      className={cn(
        "space-x-2 px-3 text-black active:text-black dark:text-black",
        className,
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <Button
        onClick={closeWindow}
        className="aspect-square h-3 w-3 cursor-default content-center items-center justify-center self-center rounded-full border border-black/[.12] bg-[#ff544d] text-center text-black/60 hover:bg-[#ff544d] active:bg-[#bf403a] active:text-black/60 dark:border-none"
      >
        {isHovering && <Icons.closeMac />}
      </Button>
      <Button
        onClick={minimizeWindow}
        className="aspect-square h-3 w-3 cursor-default content-center items-center justify-center self-center rounded-full border border-black/[.12] bg-[#ffbd2e] text-center text-black/60 hover:bg-[#ffbd2e] active:bg-[#bf9122] active:text-black/60 dark:border-none"
      >
        {isHovering && <Icons.minMac />}
      </Button>
      <Button
        onClick={isAltKeyPressed ? maximizeWindow : fullscreenWindow}
        className="aspect-square h-3 w-3 cursor-default content-center items-center justify-center self-center rounded-full border border-black/[.12] bg-[#28c93f] text-center text-black/60 hover:bg-[#28c93f] active:bg-[#1e9930] active:text-black/60 dark:border-none"
      >
        {isHovering && last}
      </Button>
    </div>
  );
}
