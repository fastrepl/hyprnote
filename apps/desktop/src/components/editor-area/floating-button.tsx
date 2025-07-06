import { RefreshCwIcon, TypeOutlineIcon, XIcon, ZapIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { useEnhancePendingState } from "@/hooks/enhance-pending";
import { Session } from "@hypr/plugin-db";
import { SplashLoader as EnhanceWIP } from "@hypr/ui/components/ui/splash";
import { cn } from "@hypr/ui/lib/utils";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";

interface FloatingButtonProps {
  session: Session;
  handleEnhance: () => void;
  isError: boolean;
  progress: number;
}

export function FloatingButton({
  session,
  handleEnhance,
  isError,
  progress,
}: FloatingButtonProps) {
  const [showRaw, setShowRaw] = useSession(session.id, (s) => [
    s.showRaw,
    s.setShowRaw,
  ]);
  const cancelEnhance = useOngoingSession((s) => s.cancelEnhance);
  const isEnhancePending = useEnhancePendingState(session.id);
  const [isHovered, setIsHovered] = useState(false);
  const [showRefreshIcon, setShowRefreshIcon] = useState(true);

  useEffect(() => {
    if (!isHovered) {
      setShowRefreshIcon(true);
    }
  }, [isHovered]);

  const handleRawView = () => {
    setShowRaw(true);
  };

  const handleEnhanceOrReset = () => {
    if (showRaw) {
      setShowRaw(false);
      setShowRefreshIcon(false);
      return;
    }

    if (isEnhancePending) {
      cancelEnhance();
    } else {
      handleEnhance();
    }
  };

  if (isError) {
    const errorRetryButtonClasses = cn(
      "rounded-xl border",
      "border-border px-4 py-2.5 transition-all ease-in-out",
      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      "hover:scale-105 transition-transform duration-200",
    );

    return (
      <button
        onClick={handleEnhance}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={errorRetryButtonClasses}
      >
        <RunOrRerun showRefresh={isHovered} />
      </button>
    );
  }

  if (!session.enhanced_memo_html && !isEnhancePending) {
    return null;
  }

  const rawButtonClasses = cn(
    "rounded-l-xl border-l border-y",
    "border-border px-4 py-2.5 transition-all ease-in-out",
    showRaw
      ? "bg-primary text-primary-foreground border-black hover:bg-neutral-800"
      : "bg-background text-neutral-400 hover:bg-neutral-100",
  );

  const enhanceButtonClasses = cn(
    "rounded-r-xl border-r border-y",
    "border border-border px-4 py-2.5 transition-all ease-in-out",
    showRaw
      ? "bg-background text-neutral-400 hover:bg-neutral-100"
      : "bg-primary text-primary-foreground border-black hover:bg-neutral-800",
  );

  const showRefresh = !showRaw && isHovered && showRefreshIcon;

  return (
    <div className="flex w-fit flex-row items-center group hover:scale-105 transition-transform duration-200">
      <button
        disabled={isEnhancePending}
        onClick={handleRawView}
        className={rawButtonClasses}
      >
        <TypeOutlineIcon size={20} />
      </button>

      <button
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleEnhanceOrReset}
        className={enhanceButtonClasses}
      >
        {isEnhancePending
          ? isHovered
            ? <XIcon size={20} />
            : (
              <div className="flex items-center gap-2">
                <EnhanceWIP size={20} strokeWidth={2} />
                {progress > 0 && (
                  <span className="text-xs font-mono">
                    {Math.round(progress * 100)}%
                  </span>
                )}
              </div>
            )
          : <RunOrRerun showRefresh={showRefresh} />}
      </button>
    </div>
  );
}

function RunOrRerun({ showRefresh }: { showRefresh: boolean }) {
  return (
    <div className="relative h-5 w-5">
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          showRefresh ? "opacity-100" : "opacity-0",
        )}
      >
        <RefreshCwIcon size={20} />
      </div>
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          showRefresh ? "opacity-0" : "opacity-100",
        )}
      >
        <ZapIcon size={20} />
      </div>
    </div>
  );
}
