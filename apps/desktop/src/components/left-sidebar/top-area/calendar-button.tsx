import { Trans } from "@lingui/react/macro";
import { CalendarDaysIcon } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { safeNavigate } from "@hypr/utils";

export function CalendarButton() {
  const handleClickCalendar = () => {
    safeNavigate({ type: "calendar" }, "");
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClickCalendar}
          className="hover:bg-neutral-200"
        >
          <CalendarDaysIcon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <Trans>Open calendar view</Trans>
      </TooltipContent>
    </Tooltip>
  );
}
