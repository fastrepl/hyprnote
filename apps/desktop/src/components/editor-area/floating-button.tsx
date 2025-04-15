import { RefreshCwIcon, TypeOutlineIcon, ZapIcon } from "lucide-react";
import { useState } from "react";

import { useEnhancePendingState } from "@/hooks/enhance-pending";
import { Session } from "@hypr/plugin-db";
import { cn } from "@hypr/ui/lib/utils";
import { SplashLoader } from "@hypr/ui/components/ui/splash";
import { useSession } from "@hypr/utils/contexts";

interface FloatingButtonProps {
  session: Session;
  handleEnhance: () => void;
}

export function FloatingButton({
  session,
  handleEnhance,
}: FloatingButtonProps) {
  const [showRaw, setShowRaw] = useSession(session.id, (s) => [
    s.showRaw,
    s.setShowRaw,
  ]);
  const isEnhancePending = useEnhancePendingState(session.id);
  const [isHovered, setIsHovered] = useState(false);

  const handleClickLeftButton = () => {
    setShowRaw(true);
  };

  const handleClickRightButton = () => {
    if (showRaw) {
      setShowRaw(false);
    } else {
      handleEnhance();
    }
  };

  if (!session.enhanced_memo_html && !isEnhancePending) {
    return null;
  }

  return (
    <div className="flex w-fit flex-row items-center group hover:scale-105 transition-transform duration-200">
      <button
        disabled={isEnhancePending}
        onClick={handleClickLeftButton}
        className={cn(
          "rounded-l-xl border-l border-y",
          "border-border px-4 py-2.5 transition-all ease-in-out",
          showRaw
            ? "bg-primary text-primary-foreground border-black hover:bg-neutral-800"
            : "bg-background text-neutral-400 hover:bg-neutral-100"
        )}
      >
        <TypeOutlineIcon size={20} />
      </button>

      <button
        disabled={isEnhancePending}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClickRightButton}
        className={cn(
          "rounded-r-xl border-r border-y",
          "border border-border px-4 py-2.5 transition-all ease-in-out",
          showRaw
            ? "bg-background text-neutral-400 hover:bg-neutral-100"
            : "bg-primary text-primary-foreground border-black hover:bg-neutral-800"
        )}
      >
        {isEnhancePending ? (
          <SplashLoader size={20} strokeWidth={2} />
        ) : (
          <div className="relative h-5 w-5">
            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-300",
                isHovered ? "opacity-100" : "opacity-0"
              )}
            >
              <RefreshCwIcon size={20} />
            </div>
            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-300",
                isHovered ? "opacity-0" : "opacity-100"
              )}
            >
              <ZapIcon size={20} />
            </div>
          </div>
        )}
      </button>
    </div>
  );
}
