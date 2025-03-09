import { AlignLeft, Zap } from "lucide-react";
import clsx from "clsx";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";

interface EnhanceControlsProps {
  showRaw: boolean;
  setShowRaw: (showRaw: boolean) => void;
}

export function EnhanceControls({ showRaw, setShowRaw }: EnhanceControlsProps) {
  return (
    <div className="flex w-fit flex-row items-center">
      <button
        onClick={() => setShowRaw(true)}
        className={clsx([
          "rounded-l-xl border border-r-0 border-border px-4 py-2.5",
          "transition-all ease-in-out",
          showRaw
            ? "bg-primary dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            : "bg-background dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700",
          showRaw
            ? "text-primary-foreground"
            : "text-neutral-200 dark:text-neutral-100",
        ])}
      >
        <AlignLeft size={20} />
      </button>

      {!showRaw ? (
        <Popover>
          <PopoverTrigger asChild>
            <div
              className={clsx([
                "flex px-4 py-2.5 flex-row items-center rounded-r-xl border border-l-0 border-border",
                "duration-400 transition-all ease-in-out",
                "bg-primary text-primary-foreground cursor-pointer dark:bg-white dark:hover:bg-neutral-200 dark:text-black",
              ])}
            >
              <Zap size={20} />
              <span className="text-sm pl-2">Stand up</span>
            </div>
          </PopoverTrigger>
          <PopoverContent className="dark:bg-neutral-800">
            <div className="dark:text-neutral-100">Template Selector</div>
          </PopoverContent>
        </Popover>
      ) : (
        <div
          className={clsx([
            "flex py-2.5 flex-row items-center rounded-r-xl border border-l-0 border-border",
            "duration-400 transition-all ease-in-out px-4",
            "bg-background text-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700",
          ])}
        >
          <button onClick={() => setShowRaw(false)}>
            <Zap
              size={20}
              className="transition-[fill] duration-200 ease-in-out"
            />
          </button>
        </div>
      )}
    </div>
  );
}
