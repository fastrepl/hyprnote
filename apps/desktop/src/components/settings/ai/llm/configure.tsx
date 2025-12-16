import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { useBillingAccess } from "../../../../billing";
import { NonHyprProviderCard, StyledStreamdown } from "../shared";
import { ProviderId, PROVIDERS } from "./shared";

export function ConfigureProviders() {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-md font-semibold">Configure Providers</h3>
      <Accordion type="single" collapsible className="space-y-3">
        <HyprProviderCard
          providerId="hyprnote"
          providerName="Hyprnote"
          icon={<img src="/assets/icon.png" alt="Hyprnote" className="size-5" />}
        />
        {PROVIDERS.filter((provider) => provider.id !== "hyprnote").map((provider) => (
          <NonHyprProviderCard
            key={provider.id}
            config={provider}
            providerType="llm"
            providers={PROVIDERS}
            providerContext={<ProviderContext providerId={provider.id} />}
          />
        ))}
      </Accordion>
    </div>
  );
}

function HyprProviderCard({
  providerId,
  providerName,
  icon,
}: {
  providerId: ProviderId;
  providerName: string;
  icon: React.ReactNode;
}) {
  const billing = useBillingAccess();
  const locked = providerId === "hyprnote" && !billing.isPro;

  return (
    <AccordionItem
      value={providerId}
      disabled={locked}
      className={cn([
        "rounded-xl border-2 bg-neutral-50",
        !locked ? "border-solid border-neutral-300" : "border-dashed",
      ])}
    >
      <AccordionTrigger
        className={cn(["capitalize gap-2 px-4", locked && "cursor-not-allowed opacity-30"])}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span>{providerName}</span>
          <span className="text-xs text-neutral-500 font-light border border-neutral-300 rounded-full px-2">
            {locked ? "Pro Required" : "Recommended"}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <ProviderContext providerId={providerId} />
      </AccordionContent>
    </AccordionItem>
  );
}

function ProviderContext({ providerId }: { providerId: ProviderId }) {
  const { isPro, upgradeToPro } = useBillingAccess();

  const content =
    providerId === "hyprnote"
      ? "We continuously test models to provide the **best performance & reliability.**"
      : providerId === "lmstudio"
        ? "- Ensure LM Studio server is **running.** (Default port is 1234)\n- Enable **CORS** in LM Studio config."
        : providerId === "custom"
          ? "We only support **OpenAI-compatible** endpoints for now."
          : providerId === "openrouter"
            ? "We filter out models from the combobox based on heuristics like **input modalities** and **tool support**."
            : providerId === "google_generative_ai"
              ? "Visit [AI Studio](https://aistudio.google.com/api-keys) to create an API key."
              : "";

  if (providerId === "hyprnote" && !isPro) {
    return (
      <div className="flex flex-row justify-between items-center gap-2">
        <StyledStreamdown>{content}</StyledStreamdown>
        <Button size="sm" variant="default" onClick={upgradeToPro}>
          Upgrade to Pro
        </Button>
      </div>
    );
  }

  if (!content) {
    return null;
  }

  return <StyledStreamdown>{content}</StyledStreamdown>;
}
