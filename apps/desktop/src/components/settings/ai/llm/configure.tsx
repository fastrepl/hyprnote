import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@hypr/ui/components/ui/accordion";
import { cn } from "@hypr/utils";

import { useForm } from "@tanstack/react-form";
import { useEffect } from "react";

import { aiProviderSchema } from "../../../../store/tinybase/main";
import * as main from "../../../../store/tinybase/main";
import { FormField, StyledStreamdown, useProvider } from "../shared";
import { ProviderId, PROVIDERS } from "./shared";

export function ConfigureProviders() {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Configure Providers</h3>
      <Accordion type="single" collapsible className="space-y-3">
        <HyprProviderCard
          providerId="hyprnote"
          providerName="Hyprnote"
          icon={<img src="/assets/icon.png" alt="Hyprnote" className="size-5" />}
        />
        {PROVIDERS
          .filter((provider) => provider.id !== "hyprnote")
          .map((provider) => (
            <NonHyprProviderCard
              key={provider.id}
              config={provider}
            />
          ))}
      </Accordion>
    </div>
  );
}

function NonHyprProviderCard({ config }: { config: typeof PROVIDERS[number] }) {
  const [provider, setProvider] = useProvider(config.id);

  useEffect(() => {
    if (!provider && config.baseUrl && !config.apiKey) {
      setProvider({
        type: "llm",
        base_url: config.baseUrl,
        api_key: "",
      });
    }
  }, [provider, config.baseUrl, config.apiKey, setProvider]);

  const form = useForm({
    onSubmit: ({ value }) => setProvider(value),
    defaultValues: provider
      ?? ({
        type: "llm",
        base_url: config.baseUrl ?? "",
        api_key: "",
      } satisfies main.AIProvider),
    listeners: {
      onChange: ({ formApi }) => {
        queueMicrotask(() => {
          const { form: { errors } } = formApi.getAllErrors();
          if (errors.length > 0) {
            console.log(errors);
          }

          formApi.handleSubmit();
        });
      },
    },
    validators: { onChange: aiProviderSchema },
  });

  return (
    <AccordionItem
      value={config.id}
      className={cn(["rounded-lg border-2 border-dashed bg-neutral-50"])}
    >
      <AccordionTrigger className={cn(["capitalize gap-2 px-4"])}>
        <div className="flex items-center gap-2">
          {config.icon}
          <span>{config.displayName}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 space-y-6">
        <ProviderContext providerId={config.id} />
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {!config.baseUrl && (
            <form.Field name="base_url">
              {(field) => (
                <FormField
                  field={field}
                  label="Base URL"
                  icon="mdi:web"
                />
              )}
            </form.Field>
          )}
          {config?.apiKey && (
            <form.Field name="api_key">
              {(field) => (
                <FormField
                  field={field}
                  label="API Key"
                  icon="mdi:key"
                  placeholder="Enter your API key"
                  type="password"
                />
              )}
            </form.Field>
          )}
          {config.baseUrl && (
            <details className="space-y-4 pt-2">
              <summary className="text-xs cursor-pointer text-neutral-600 hover:text-neutral-900 hover:underline">
                Advanced
              </summary>
              <div className="mt-4">
                <form.Field name="base_url">
                  {(field) => (
                    <FormField
                      field={field}
                      label="Base URL"
                      icon="mdi:web"
                    />
                  )}
                </form.Field>
              </div>
            </details>
          )}
        </form>
      </AccordionContent>
    </AccordionItem>
  );
}

function HyprProviderCard(
  {
    providerId,
    providerName,
    icon,
  }: {
    providerId: ProviderId;
    providerName: string;
    icon: React.ReactNode;
  },
) {
  return (
    <AccordionItem
      value={providerId}
      className={cn(["rounded-lg border-2 border-dashed bg-neutral-50"])}
    >
      <AccordionTrigger className={cn(["capitalize gap-2 px-4"])}>
        <div className="flex items-center gap-2">
          {icon}
          <span>{providerName}</span>
          <span className="text-xs text-neutral-500 font-light border border-neutral-300 rounded-full px-2">
            Recommended
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
  const content = providerId === "hyprnote"
    ? "The Hyprnote team continuously tests different models to provide the **best performance & reliability.**"
    : providerId === "lmstudio"
    ? "- Ensure LM Studio server is **running.** (Default port is 1234)\n- Enable **CORS** in LM Studio config."
    : providerId === "custom"
    ? "We only support **OpenAI compatible** endpoints for now."
    : providerId === "openrouter"
    ? "We filter out models from the combobox based on heuristics like **input modalities** and **tool support**."
    : "";

  if (!content) {
    return null;
  }

  return <StyledStreamdown>{content}</StyledStreamdown>;
}
