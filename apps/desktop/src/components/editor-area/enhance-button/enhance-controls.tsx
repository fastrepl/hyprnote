import { AlignLeft, Loader2, Zap } from "lucide-react";

import { cn } from "@hypr/ui/lib/utils";

interface EnhanceControlsProps {
  showRaw: boolean;
  setShowRaw: (showRaw: boolean) => void;
  enhanceStatus: "error" | "idle" | "pending" | "success";
  handleRunEnhance: () => void;
}

export function EnhanceControls({
  showRaw,
  setShowRaw,
  enhanceStatus,
  handleRunEnhance,
}: EnhanceControlsProps) {
  const handleClickLeftButton = () => {
    setShowRaw(true);
  };

  const handleClickRightButton = () => {
    if (showRaw) {
      setShowRaw(false);
    } else {
      handleRunEnhance();
    }
  };

  return (
    <div className="flex w-fit flex-row items-center">
      <button
        disabled={enhanceStatus === "pending"}
        onClick={handleClickLeftButton}
        className={cn(
          "rounded-l-xl border-l border-y",
          "border-border px-4 py-2.5 transition-all ease-in-out",
          showRaw
            ? "bg-primary text-primary-foreground border-black"
            : "bg-background text-neutral-200",
        )}
      >
        <AlignLeft size={20} />
      </button>

      <button
        disabled={enhanceStatus === "pending"}
        onClick={handleClickRightButton}
        className={cn(
          "rounded-r-xl border-r border-y",
          "border border-border px-4 py-2.5 transition-all ease-in-out",
          showRaw
            ? "bg-background text-neutral-200"
            : "bg-primary text-primary-foreground border-black",
        )}
      >
        {enhanceStatus === "pending" ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
      </button>
    </div>
  );
}
