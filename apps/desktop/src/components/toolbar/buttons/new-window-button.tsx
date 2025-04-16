import { Trans } from "@lingui/react/macro";
import { useMatch } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { safeNavigate } from "@hypr/utils";

export function NewWindowButton() {
  const organizationMatch = useMatch({
    from: "/app/organization/$id",
    shouldThrow: false,
  });
  const humanMatch = useMatch({ from: "/app/human/$id", shouldThrow: false });

  const handleClick = () => {
    if (organizationMatch?.params.id) {
      safeNavigate(
        { type: "organization", value: organizationMatch.params.id },
        "",
      );
    } else if (humanMatch?.params.id) {
      safeNavigate({ type: "human", value: humanMatch.params.id }, "");
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          className="hover:bg-neutral-200"
          aria-label="Open in new window"
        >
          <ArrowUpRight size={16} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <Trans>Open in new window</Trans>
      </TooltipContent>
    </Tooltip>
  );
}
