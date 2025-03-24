import { Button } from "@hypr/ui/components/ui/button";
import { Trans } from "@lingui/react/macro";
import { Zap } from "lucide-react";

interface EnhanceOnlyButtonProps {
  handleClick: () => void;
}

export function EnhanceOnlyButton({ handleClick }: EnhanceOnlyButtonProps) {
  return (
    <Button
      variant="default"
      size="lg"
      onClick={handleClick}
      className="hover:scale-95 transition-all"
    >
      <Zap size={20} />
      <Trans>Hypercharge</Trans>
    </Button>
  );
}
