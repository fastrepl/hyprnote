import { useMutationState } from "@tanstack/react-query";
import { AlignLeft, Loader2, Zap } from "lucide-react";
import { useMemo } from "react";

import { Session } from "@hypr/plugin-db";
import { cn } from "@hypr/ui/lib/utils";
import { useSession } from "@hypr/utils/contexts";

interface FloatingButtonProps {
  session: Session;
  handleEnhance: () => void;
}

export function FloatingButton({ session, handleEnhance }: FloatingButtonProps) {
  const [showRaw, setShowRaw] = useSession(session.id, (s) => [s.showRaw, s.setShowRaw]);

  const enhanceStates = useMutationState({
    filters: { mutationKey: ["enhance", session.id], exact: true },
    select: (mutation) => mutation.state.status,
  });
  const isEnhancePending = useMemo(() => enhanceStates.some((s) => s === "pending"), [enhanceStates]);

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
    <div className="flex w-fit flex-row items-center">
      <button
        disabled={isEnhancePending}
        onClick={handleClickLeftButton}
        className={cn(
          "rounded-l-xl border-l border-y",
          "border-border px-4 py-2.5 transition-all ease-in-out",
          showRaw
            ? "bg-primary text-primary-foreground border-black hover:bg-primary/90"
            : "bg-background text-neutral-400 hover:bg-neutral-100",
        )}
      >
        <AlignLeft size={20} />
      </button>

      <button
        disabled={isEnhancePending}
        onClick={handleClickRightButton}
        className={cn(
          "rounded-r-xl border-r border-y",
          "border border-border px-4 py-2.5 transition-all ease-in-out",
          showRaw
            ? "bg-background text-neutral-400 hover:bg-neutral-100"
            : "bg-primary text-primary-foreground border-black hover:bg-primary/90",
        )}
      >
        {isEnhancePending ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
      </button>
    </div>
  );
}
