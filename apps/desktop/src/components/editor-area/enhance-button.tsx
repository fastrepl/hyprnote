import { AlignLeft, Loader2, Zap } from "lucide-react";
import { useMemo } from "react";

import { Session } from "@hypr/plugin-db";
import { cn } from "@hypr/ui/lib/utils";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";
import { type MutationStatus, useMutationState } from "@tanstack/react-query";

interface EnhanceButtonProps {
  session: Session;
  handleEnhance: () => void;
}

export function EnhanceButton({ session, handleEnhance }: EnhanceButtonProps) {
  const [showRaw, setShowRaw] = useSession(session.id, (s) => [s.showRaw, s.setShowRaw]);
  const ongoingSessionStatus = useOngoingSession((s) => s.status);

  const enhances = useMutationState({
    filters: { mutationKey: ["enhance", session.id], exact: true },
    select: (mutation) => mutation.state.status,
  });

  const enhanceStatus = useMemo(() => {
    return enhances.at(0);
  }, [enhances]);

  const show = useMemo(() => {
    if (ongoingSessionStatus !== "inactive") {
      return false;
    }

    return session.enhanced_memo_html || enhanceStatus === "pending" || session.conversations.length > 0;
  }, [session.enhanced_memo_html, enhanceStatus, session.conversations, ongoingSessionStatus]);

  return show
    ? (
      <EnhanceControls
        showRaw={showRaw}
        setShowRaw={setShowRaw}
        enhanceStatus={enhanceStatus}
        handleRunEnhance={handleEnhance}
      />
    )
    : null;
}

interface EnhanceControlsProps {
  showRaw: boolean;
  setShowRaw: (showRaw: boolean) => void;
  enhanceStatus?: MutationStatus;
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
            ? "bg-primary text-primary-foreground border-black hover:bg-primary/90"
            : "bg-background text-neutral-400 hover:bg-neutral-100",
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
            ? "bg-background text-neutral-400 hover:bg-neutral-100"
            : "bg-primary text-primary-foreground border-black hover:bg-primary/90",
        )}
      >
        {enhanceStatus === "pending" ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
      </button>
    </div>
  );
}
