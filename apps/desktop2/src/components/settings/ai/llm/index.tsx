import { Anthropic, LmStudio, Ollama, OpenAI } from "@lobehub/icons";
import { useForm } from "@tanstack/react-form";
import { Streamdown } from "streamdown";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@hypr/ui/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { cn } from "@hypr/ui/lib/utils";
import { aiProviderSchema } from "../../../../store/tinybase/internal";
import * as internal from "../../../../store/tinybase/internal";
import { FormField, useProvider } from "../shared";
import { ModelCombobox } from "../shared/model-combobox";

const PROVIDERS = [
  {
    id: "hyprnote",
    displayName: "Hyprnote",
    badge: "Recommended",
    icon: <img src="/assets/icon.png" alt="Hyprnote" className="size-5" />,
    apiKey: false,
    baseUrl: { value: "https://api.hyprnote.com/v1", immutable: true },
  },
  {
    id: "openai",
    displayName: "OpenAI",
    badge: null,
    icon: <OpenAI size={16} />,
    apiKey: true,
    baseUrl: { value: "https://api.openai.com/v1", immutable: true },
  },
  {
    id: "anthropic",
    displayName: "Anthropic",
    badge: null,
    icon: <Anthropic size={16} />,
    apiKey: true,
    baseUrl: { value: "https://api.anthropic.com/v1", immutable: true },
  },
  {
    id: "ollama",
    displayName: "Ollama",
    badge: null,
    icon: <Ollama size={16} />,
    apiKey: true,
    baseUrl: { value: "http://localhost:11434", immutable: false },
  },
  {
    id: "lmstudio",
    displayName: "LM Studio",
    badge: null,
    icon: <LmStudio size={16} />,
    apiKey: true,
    baseUrl: { value: "http://localhost:8000", immutable: false },
  },
];

type ProviderId = typeof PROVIDERS[number]["id"];

export function LLM() {
  return (
    <div className="space-y-6">
      <SelectProviderAndModel />
      <ConfigureProviders />
    </div>
  );
}

function SelectProviderAndModel() {
  const configuredProviders = internal.UI.useResultTable(internal.QUERIES.llmProviders, internal.STORE_ID);
  const selectedProvider = internal.UI.useValue("current_llm_provider", internal.STORE_ID);

  const handleSelectProvider = internal.UI.useSetValueCallback(
    "current_llm_provider",
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

            const providerData = configuredProviders[form.getFieldValue("provider")];
            const baseUrl = typeof providerData?.base_url === "string"
              ? providerData.base_url
              : selectedProviderConfig?.baseUrl.value;
            const apiKey = typeof providerData?.api_key === "string"
              ? providerData.api_key
              : undefined;

            return (
              <div style={{ flex: 6 }}>
                <ModelCombobox
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                  baseUrl={baseUrl}
                  apiKey={apiKey}
                  fallbackModels={[]}
                  disabled={!selectedProviderConfig}
                  placeholder="Select a model"
                />
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
        model: "",
        base_url: "",
        api_key: "",
      } satisfies internal.AIProvider),
    listeners: { onChange: ({ formApi }) => formApi.handleSubmit() },
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
          {!providerConfig.baseUrl.immutable && (
            <form.Field name="base_url" defaultValue={providerConfig.baseUrl.value}>
              {(field) => (
                <FormField
                  field={field}
                  label="Base URL"
                  icon="mdi:web"
                />
              )}
            </form.Field>
          )}

          {providerConfig?.apiKey && (
            <form.Field name="api_key" defaultValue="">
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
