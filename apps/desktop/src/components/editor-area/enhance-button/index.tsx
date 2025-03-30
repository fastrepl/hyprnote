import { Session } from "@hypr/plugin-db";
import { useOngoingSession } from "@hypr/utils/contexts";

import { EnhanceControls } from "./enhance-controls";
import { EnhanceOnlyButton } from "./enhance-only-button";

interface EnhanceButtonProps {
  handleClick: () => void;
  session: Session;
  showRaw: boolean;
  setShowRaw: (showRaw: boolean) => void;
  enhanceStatus: "error" | "idle" | "pending" | "success";
}

export function EnhanceButton({
  handleClick,
  session,
  showRaw,
  setShowRaw,
  enhanceStatus,
}: EnhanceButtonProps) {
  const ongoingSessionStore = useOngoingSession((s) => ({
    status: s.status,
    timeline: s.timeline,
  }));

  if (ongoingSessionStore.status !== "inactive") {
    return null;
  }

  return (session.enhanced_memo_html || enhanceStatus === "pending")
    ? (
      <EnhanceControls
        showRaw={showRaw}
        setShowRaw={setShowRaw}
        enhanceStatus={enhanceStatus}
        handleRunEnhance={handleClick}
      />
    )
    : session.conversations.length
    ? <EnhanceOnlyButton handleRunEnhance={handleClick} enhanceStatus={enhanceStatus} />
    : null;
}
