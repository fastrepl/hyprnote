// https://github.com/agmmnn/tauri-controls/blob/f3592f0/apps/tauri-controls/src/tauri-controls/controls/windows.tsx

import { type HTMLProps } from "react";

import { useWindow } from "@/contexts/window";
import { cn } from "@/utils";

import { Icons } from "./icons";
import { Button } from "./button";

export function Windows({ className, ...props }: HTMLProps<HTMLDivElement>) {
  const { minimizeWindow, maximizeWindow, closeWindow } = useWindow();

  return (
    <div className={cn("h-8", className)} {...props}>
      <Button
        onClick={minimizeWindow}
        className="max-h-8 w-[46px] cursor-default rounded-none bg-transparent text-black/90 hover:bg-black/[.05] active:bg-black/[.03] dark:text-white dark:hover:bg-white/[.06] dark:active:bg-white/[.04]"
      >
        <Icons.minimizeWin />
      </Button>
      <Button
        onClick={maximizeWindow}
        className={cn(
          "max-h-8 w-[46px] cursor-default rounded-none bg-transparent",
          "text-black/90 hover:bg-black/[.05] active:bg-black/[.03] dark:text-white dark:hover:bg-white/[.06] dark:active:bg-white/[.04]",
        )}
      >
        <Icons.maximizeWin />
      </Button>
      <Button
        onClick={closeWindow}
        className="max-h-8 w-[46px] cursor-default rounded-none bg-transparent text-black/90 hover:bg-[#c42b1c] hover:text-white active:bg-[#c42b1c]/90 dark:text-white"
      >
        <Icons.closeWin />
      </Button>
    </div>
  );
}
