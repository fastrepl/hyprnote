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
          "h-9 rounded-l-xl border border-r-0 border-border px-3",
          "duration-400 transition-all ease-in-out",
          showRaw ? "bg-primary/20" : "bg-background",
          showRaw ? "text-primary" : "text-neutral-200",
        ])}
      >
        <AlignLeft size={20} />
      </button>
      <div
        className={clsx([
          "flex h-9 flex-row items-center rounded-r-xl border border-l-0 border-border",
          "duration-400 transition-all ease-in-out",
          showRaw ? "px-3" : "pl-2 pr-1",
          !showRaw ? "bg-primary/20" : "bg-background",
          !showRaw ? "text-primary" : "text-neutral-200",
        ])}
      >
        <button onClick={() => setShowRaw(false)}>
          <Zap
            size={20}
            className={clsx([
              "transition-[fill] duration-200 ease-in-out",
              !showRaw ? "fill-primary/60" : "fill-background",
            ])}
          />
        </button>
        {!showRaw && (
          <Popover>
            <PopoverTrigger className="flex flex-row items-center text-xs">
              <span className="rounded-xl px-2 py-0.5 hover:bg-indigo-200">
                Stand up
              </span>
            </PopoverTrigger>
            <PopoverContent>
              <div>Template Selector</div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
