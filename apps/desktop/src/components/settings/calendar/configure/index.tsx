import { platform } from "@tauri-apps/plugin-os";

import { Accordion } from "@hypr/ui/components/ui/accordion";

import { PROVIDERS } from "../shared";
import { AppleCalendarProviderCard } from "./apple";
import { DisabledProviderCard } from "./cloud";

export function ConfigureProviders() {
  const isMacos = platform() === "macos";

  const visibleProviders = PROVIDERS.filter(
    (p) => p.platform === "all" || (p.platform === "macos" && isMacos),
  );

  return (
    <Accordion type="single" collapsible className="space-y-3">
      {visibleProviders.map((provider) =>
        provider.id === "apple" ? (
          <AppleCalendarProviderCard key={provider.id} />
        ) : (
          <DisabledProviderCard key={provider.id} config={provider} />
        ),
      )}
    </Accordion>
  );
}
