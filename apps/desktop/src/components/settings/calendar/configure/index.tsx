import { Accordion } from "@hypr/ui/components/ui/accordion";

import { useIsMacos } from "../../../../hooks/usePlatform";
import { PROVIDERS } from "../shared";
import { AppleCalendarProviderCard } from "./apple";
import { DisabledProviderCard } from "./cloud";

export function ConfigureProviders() {
  const isMacos = useIsMacos();

  const visibleProviders = PROVIDERS.filter(
    (p) => p.platform === "all" || (p.platform === "macos" && isMacos),
  );

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Configure Providers</h3>
      <Accordion type="single" collapsible className="space-y-3">
        {visibleProviders.map((provider) =>
          provider.id === "apple" ? (
            <AppleCalendarProviderCard key={provider.id} />
          ) : (
            <DisabledProviderCard key={provider.id} config={provider} />
          ),
        )}
      </Accordion>
    </div>
  );
}
