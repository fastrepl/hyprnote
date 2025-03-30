import { Trans } from "@lingui/react/macro";
import { Loader2, Zap } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";

interface EnhanceOnlyButtonProps {
  handleRunEnhance: () => void;
  enhanceStatus: "error" | "idle" | "pending" | "success";
}

export function EnhanceOnlyButton({
  handleRunEnhance,
  enhanceStatus,
}: EnhanceOnlyButtonProps) {
  return (
    <Button
      onClick={handleRunEnhance}
      disabled={enhanceStatus === "pending"}
      className="flex items-center gap-2 bg-primary hover:bg-primary/90"
    >
      {enhanceStatus === "pending"
        ? <Loader2 className="animate-spin" size={16} />
        : <Zap size={16} />}
      <Trans>Enhance</Trans>
    </Button>
  );
}
