import { Icon } from "@iconify-icon/react";
import { useForm } from "@tanstack/react-form";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@hypr/ui/components/ui/accordion";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@hypr/ui/components/ui/input-group";
import { cn } from "@hypr/ui/lib/utils";
import { aiProviderSchema } from "../../../store/tinybase/internal";
import * as internal from "../../../store/tinybase/internal";
import { useProvider } from "./shared";

const PROVIDERS = [
  {
    id: "openai",
    displayName: "OpenAI",
    icon: "simple-icons:openai",
    baseUrl: { value: "https://api.openai.com/v1", immutable: true },
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  {
    id: "anthropic",
    displayName: "Anthropic",
    icon: "simple-icons:anthropic",
    baseUrl: { value: "https://api.anthropic.com/v1", immutable: true },
    models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
  },
  {
    id: "ollama",
    displayName: "Ollama",
    icon: "simple-icons:ollama",
    baseUrl: { value: "http://localhost:11434", immutable: false },
    models: ["llama3.2", "llama3.1", "mistral", "qwen2.5"],
  },
  {
    id: "lmstudio",
    displayName: "LM Studio",
    icon: "logos:lmstudio",
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
  const selectedProvider = internal.UI.useValue("current_llm_provider", internal.STORE_ID);
  const providers = internal.UI.useResultTable(internal.QUERIES.llmProviders, internal.STORE_ID);

  return (
    <div>
      <pre>{JSON.stringify(selectedProvider, null, 2)}</pre>
      <pre>{JSON.stringify(providers, null, 2)}</pre>
    </div>
  );
}

function ConfigureProviders() {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">Configure Providers</h3>
      <Accordion type="single" collapsible className="space-y-3">
        {PROVIDERS.map((provider) => (
          <CloudProviderCard
            key={provider.id}
            icon={<Icon icon={provider.icon} />}
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
    listeners: {
      onChange: ({ formApi }) => formApi.handleSubmit(),
    },
    validators: { onChange: aiProviderSchema },
  });

  return (
    <AccordionItem
      value={name}
      className={cn([
        "rounded-lg border-2 border-dashed",
      ])}
    >
      <AccordionTrigger
        className={cn(["capitalize gap-2 px-4"])}
      >
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
            {(field) => {
              const { errors } = field.state.meta;
              const hasError = errors && errors.length > 0;
              const errorMessage = hasError
                ? (typeof errors[0] === "string" ? errors[0] : (errors[0] as any)?.message || "Invalid value")
                : null;
              return (
                <div
                  className={cn([
                    "space-y-2",
                    providerConfig.baseUrl.immutable && "hidden",
                  ])}
                >
                  <label className="block text-sm font-medium">Base URL</label>
                  <InputGroup>
                    <InputGroupAddon align="inline-start">
                      <InputGroupText>
                        <Icon icon="mdi:web" />
                      </InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      name={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={providerConfig.baseUrl.value}
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
            }}
          </form.Field>
          <form.Field name="api_key">
            {(field) => {
              const { errors } = field.state.meta;
              const hasError = errors && errors.length > 0;
              const errorMessage = hasError
                ? (typeof errors[0] === "string" ? errors[0] : (errors[0] as any)?.message || "Invalid value")
                : null;
              return (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">API Key</label>
                  <InputGroup>
                    <InputGroupAddon align="inline-start">
                      <InputGroupText>
                        <Icon icon="mdi:key" />
                      </InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      name={field.name}
                      type="password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Enter your API key"
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
            }}
          </form.Field>
        </form>
      </AccordionContent>
    </AccordionItem>
  );
}
