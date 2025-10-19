import { Icon } from "@iconify-icon/react";

import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@hypr/ui/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { cn } from "@hypr/ui/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "../../../hooks/useQuery";
import * as internal from "../../../store/tinybase/internal";
import { aiProviderSchema } from "../../../store/tinybase/internal";
import { FormField, useProvider } from "./shared";

const PROVIDERS = [
  {
    id: "deepgram",
    displayName: "Deepgram",
    icon: <Icon icon="simple-icons:deepgram" className="size-4" />,
    baseUrl: { value: "https://api.deepgram.com/v1", immutable: true },
    models: ["nova-3", "nova-3-general", "nova-3-medical"],
  },
  {
    id: "deepgram-custom",
    displayName: "Deepgram (Custom)",
    badge: null,
    icon: <Icon icon="simple-icons:deepgram" className="size-4" />,
    baseUrl: { value: "https://api.openai.com/v1", immutable: false },
    models: ["nova-3", "nova-3-general", "nova-3-medical"],
  },
];

export function STT() {
  return (
    <div className="space-y-6">
      <SelectProviderAndModel />
      <ConfigureProviders />
    </div>
  );
}

function SelectProviderAndModel() {
  const configuredProviders = internal.UI.useResultTable(internal.QUERIES.sttProviders, internal.STORE_ID);
  const selectedProvider = internal.UI.useValue("current_stt_provider", internal.STORE_ID);

  const handleSelectProvider = internal.UI.useSetValueCallback(
    "current_stt_provider",
    (provider: string) => provider,
    [],
    internal.STORE_ID,
  );

  const form = useForm({
    defaultValues: {
      provider: selectedProvider || "",
      model: "",
    },
    listeners: { onChange: ({ formApi }) => formApi.handleSubmit() },
    onSubmit: ({ value }) => handleSelectProvider(value.provider),
  });

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-md font-semibold">Model being used</h3>
      <div
        className={cn([
          "flex flex-row items-center gap-4",
          "p-4 rounded-md border border-gray-500 bg-gray-50",
          !!selectedProvider ? "border-solid" : "border-dashed",
        ])}
      >
        <form.Field
          name="provider"
          listeners={{ onChange: () => form.setFieldValue("model", "") }}
        >
          {(field) => (
            <div style={{ flex: 4 }}>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((provider) => (
                    <SelectItem
                      key={provider.id}
                      value={provider.id}
                      disabled={!configuredProviders[provider.id]}
                    >
                      <div className="flex items-center gap-2">
                        {provider.icon}
                        <span>{provider.displayName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>

        <span className="text-gray-500">/</span>

        <form.Field name="model">
          {(field) => {
            const selectedProviderConfig = PROVIDERS.find(
              (p) => p.id === form.getFieldValue("provider"),
            );
            const availableModels = selectedProviderConfig?.models || [];

            return (
              <div style={{ flex: 6 }}>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value)}
                  disabled={!selectedProviderConfig || availableModels.length === 0}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }}
        </form.Field>
      </div>
    </div>
  );
}

function ConfigureProviders() {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Configure Providers</h3>
      <Accordion type="single" collapsible className="space-y-3">
        <HyprProviderCard
          name="Hyprnote"
          icon={<img src="/assets/icon.png" alt="Hyprnote" className="size-5" />}
        />
        {PROVIDERS.map((provider) => (
          <NonHyprProviderCard
            key={provider.id}
            icon={provider.icon}
            name={provider.displayName}
            providerConfig={provider}
          />
        ))}
      </Accordion>
    </div>
  );
}

function NonHyprProviderCard({
  name,
  icon,
  providerConfig,
}: {
  name: string;
  icon: React.ReactNode;
  providerConfig: typeof PROVIDERS[number];
}) {
  const [provider, setProvider] = useProvider(name);

  const form = useForm({
    onSubmit: ({ value }) => setProvider(value),
    defaultValues: provider
      ?? ({
        type: "stt",
        model: "",
        base_url: "",
        api_key: "",
      } satisfies internal.AIProvider),
    listeners: { onChange: ({ formApi }) => formApi.handleSubmit() },
    validators: { onChange: aiProviderSchema },
  });

  return (
    <AccordionItem
      value={name}
      className={cn(["rounded-lg border-2 border-dashed bg-gray-50"])}
    >
      <AccordionTrigger className={cn(["capitalize gap-2 px-4"])}>
        <div className="flex items-center gap-2">
          {icon}
          <span>{name}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <form.Field name="base_url">
            {(field) => (
              <FormField
                field={field}
                label="Base URL"
                icon="mdi:web"
                placeholder={providerConfig.baseUrl.value}
                hidden={providerConfig.baseUrl.immutable}
              />
            )}
          </form.Field>
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
        </form>
      </AccordionContent>
    </AccordionItem>
  );
}

function HyprProviderCard({ name, icon }: { name: string; icon: React.ReactNode }) {
  const parakeet2 = useQuery({
    queryFn: () => localSttCommands.isModelDownloaded("am-parakeet-v2"),
    refetchInterval: 1500,
  });

  const parakeet3 = useQuery({
    queryFn: () => localSttCommands.isModelDownloaded("am-parakeet-v3"),
    refetchInterval: 1500,
  });

  return (
    <AccordionItem
      value={name}
      className={cn(["rounded-lg border-2 border-dashed bg-gray-50"])}
    >
      <AccordionTrigger className={cn(["capitalize gap-2 px-4"])}>
        <div className="flex items-center gap-2">
          {icon}
          <span>{name}</span>
          <span className="text-xs text-gray-500 font-light border border-gray-300 rounded-full px-2">
            Recommended
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <pre>{JSON.stringify(parakeet2, null, 2)}</pre>
        <pre>{JSON.stringify(parakeet3, null, 2)}</pre>
      </AccordionContent>
    </AccordionItem>
  );
}
