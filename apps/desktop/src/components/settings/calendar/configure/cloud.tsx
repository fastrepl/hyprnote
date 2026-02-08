import {
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";
import { cn } from "@hypr/utils";

import { PROVIDERS } from "../shared";

export function DisabledProviderCard({
  config,
}: {
  config: (typeof PROVIDERS)[number];
}) {
  return (
    <AccordionItem
      disabled
      value={config.id}
      className="rounded-xl border-2 border-dashed bg-muted/40"
    >
      <AccordionTrigger
        className={cn([
          "capitalize gap-2 px-4",
          "cursor-not-allowed opacity-50",
        ])}
      >
        <div className="flex items-center gap-2">
          {config.icon}
          <span>{config.displayName}</span>
          {config.badge && (
            <span className="text-xs text-muted-foreground font-light border border-border rounded-full px-2">
              {config.badge}
            </span>
          )}
        </div>
      </AccordionTrigger>
    </AccordionItem>
  );
}
