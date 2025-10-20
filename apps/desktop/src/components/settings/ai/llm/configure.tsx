import { useForm } from "@tanstack/react-form";
import { Streamdown } from "streamdown";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@hypr/ui/components/ui/accordion";
import { cn } from "@hypr/utils";
import { aiProviderSchema } from "../../../../store/tinybase/internal";
import * as internal from "../../../../store/tinybase/internal";
import { FormField, useProvider } from "../shared";
import { ProviderId, PROVIDERS } from "./shared";

export function ConfigureProviders() {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Configure Providers</h3>
      <Accordion type="single" collapsible className="space-y-3">
        {PROVIDERS.map((provider) => (
          <ProviderCard
            key={provider.id}
            icon={provider.icon}
            providerId={provider.id}
            providerName={provider.displayName}
            providerConfig={provider}
          />
        ))}
      </Accordion>
    </div>
  );
}

function ProviderCard({
  providerId,
  providerName,
  icon,
  providerConfig,
}: {
  providerId: ProviderId;
  providerName: string;
  icon: React.ReactNode;
  providerConfig: typeof PROVIDERS[number];
}) {
  const [provider, setProvider] = useProvider(providerId);

  const form = useForm({
    onSubmit: ({ value }) => setProvider(value),
    defaultValues: provider
      ?? ({
        type: "llm",
        base_url: "",
        api_key: "",
      } satisfies internal.AIProvider),
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
      value={providerId}
      className={cn(["rounded-lg border-2 border-dashed bg-gray-50"])}
    >
      <AccordionTrigger className={cn(["capitalize gap-2 px-4"])}>
        <div className="flex items-center gap-2">
          {icon}
          <span>{providerName}</span>
          {providerConfig.badge && (
            <span className="text-xs text-gray-500 font-light border border-gray-300 rounded-full px-2">
              {providerConfig.badge}
            </span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <ProviderContext providerId={providerId} />
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <form.Field name="base_url" defaultValue={providerConfig.baseUrl.value}>
            {(field) => (
              <FormField
                field={field}
                hidden={providerConfig.baseUrl.immutable}
                label="Base URL"
                icon="mdi:web"
              />
            )}
          </form.Field>
          <form.Field name="api_key">
            {(field) => (
              <FormField
                field={field}
                hidden={!providerConfig?.apiKey}
                label="API Key"
                icon="mdi:key"
                placeholder="Enter your API key"
                type="password"
              />
            )}
          </form.Field>
        </form>
      </AccordionContent>
    </AccordionItem>
  );
}

function ProviderContext({ providerId }: { providerId: ProviderId }) {
  const content = providerId === "hyprnote"
    ? "Hyprnote is great"
    : "";

  if (!content) {
    return null;
  }

  return (
    <Streamdown className="text-sm mt-1 mb-6">
      {content}
    </Streamdown>
  );
}
