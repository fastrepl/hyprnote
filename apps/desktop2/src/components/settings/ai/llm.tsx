import { Icon } from "@iconify-icon/react";
import { Anthropic, LmStudio, Ollama, OpenAI } from "@lobehub/icons";
import { useForm } from "@tanstack/react-form";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@hypr/ui/components/ui/accordion";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@hypr/ui/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { cn } from "@hypr/ui/lib/utils";
import { aiProviderSchema } from "../../../store/tinybase/internal";
import * as internal from "../../../store/tinybase/internal";
import { useProvider } from "./shared";

const PROVIDERS = [
  {
    id: "hyprnote",
    displayName: "Hyprnote",
    badge: "Pro",
    icon: <img src="/assets/icon.png" alt="Hyprnote" className="size-5" />,
    baseUrl: { value: "https://api.openai.com/v1", immutable: true },
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  {
    id: "openai",
    displayName: "OpenAI",
    badge: null,
    icon: <OpenAI size={16} />,
    baseUrl: { value: "https://api.openai.com/v1", immutable: true },
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  {
    id: "anthropic",
    displayName: "Anthropic",
    badge: null,
    icon: <Anthropic size={16} />,
    baseUrl: { value: "https://api.anthropic.com/v1", immutable: true },
    models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
  },
  {
    id: "ollama",
    displayName: "Ollama",
    badge: null,
    icon: <Ollama size={16} />,
    baseUrl: { value: "http://localhost:11434", immutable: false },
    models: ["llama3.2", "llama3.1", "mistral", "qwen2.5"],
  },
  {
    id: "lmstudio",
    displayName: "LM Studio",
    badge: null,
    icon: <LmStudio size={16} />,
    baseUrl: { value: "http://localhost:8000", immutable: false },
    models: [],
  },
];

export function LLM() {
  return (
    <div className="space-y-6">
      <CurrentProviderAndModel />
      <ConfigureProviders />
    </div>
  );
}

function CurrentProviderAndModel() {
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
          selectedProvider ? "border-solid" : "border-dashed",
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
        {PROVIDERS.map((provider) => (
          <CloudProviderCard
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

function CloudProviderCard({
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
      value={name}
      className={cn(["rounded-lg border-2 border-dashed bg-gray-50"])}
    >
      <AccordionTrigger className={cn(["capitalize gap-2 px-4"])}>
        <div className="flex items-center gap-2">
          {icon}
          <span>{name}</span>
          {providerConfig.badge && (
            <span className="text-xs text-gray-500 font-light border border-gray-300 rounded-full px-2">
              {providerConfig.badge}
            </span>
          )}
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

function FormField({
  field,
  label,
  icon,
  placeholder,
  type,
  hidden,
}: {
  field: any;
  label: string;
  icon: string;
  placeholder: string;
  type?: string;
  hidden?: boolean;
}) {
  const { errors } = field.state.meta;
  const hasError = errors && errors.length > 0;
  const errorMessage = hasError
    ? (typeof errors[0] === "string" ? errors[0] : (errors[0] as any)?.message || "Invalid value")
    : null;

  return (
    <div className={cn(["space-y-2", hidden && "hidden"])}>
      <label className="block text-xs font-medium">{label}</label>
      <InputGroup className="bg-white">
        <InputGroupAddon align="inline-start">
          <InputGroupText>
            <Icon icon={icon} />
          </InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          name={field.name}
          type={type}
          value={field.state.value}
          onChange={(e) => field.handleChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={hasError}
        />
      </InputGroup>
      {errorMessage && (
        <p className="text-destructive text-xs flex items-center gap-1.5">
          <Icon icon="mdi:alert-circle" className="size-3.5" />
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
}
