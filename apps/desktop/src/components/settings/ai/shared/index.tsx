import { Icon } from "@iconify-icon/react";
import { type AnyFieldApi, useForm } from "@tanstack/react-form";
import type { ReactNode } from "react";
import { Streamdown } from "streamdown";

import type { AIProvider } from "@hypr/store";
import { aiProviderSchema } from "@hypr/store";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@hypr/ui/components/ui/input-group";
import { cn } from "@hypr/utils";

import { useBillingAccess } from "../../../../billing";
import * as settings from "../../../../store/tinybase/settings";

export * from "./model-combobox";

type ProviderType = "stt" | "llm";

type ProviderConfig = {
  id: string;
  displayName: string;
  icon: ReactNode;
  badge?: string | null;
  baseUrl?: string;
  apiKey?: boolean;
  disabled?: boolean;
  requiresPro?: boolean;
};

function useIsProviderConfigured(
  providerId: string,
  providerType: ProviderType,
  providers: readonly ProviderConfig[],
) {
  const query =
    providerType === "stt"
      ? settings.QUERIES.sttProviders
      : settings.QUERIES.llmProviders;

  const configuredProviders = settings.UI.useResultTable(
    query,
    settings.STORE_ID,
  );
  const providerDef = providers.find((p) => p.id === providerId);
  const config = configuredProviders[providerId];

  if (!config) {
    return false;
  }

  if (providerType === "stt") {
    if (!providerDef?.baseUrl && !config.base_url) {
      return false;
    }
    if (!config.api_key) {
      return false;
    }
  } else {
    if (!config.base_url) {
      return false;
    }
    if (providerDef?.apiKey && !config.api_key) {
      return false;
    }
  }

  return true;
}

export function NonHyprProviderCard({
  config,
  providerType,
  providers,
  providerContext,
}: {
  config: ProviderConfig;
  providerType: ProviderType;
  providers: readonly ProviderConfig[];
  providerContext?: ReactNode;
}) {
  const billing = useBillingAccess();
  const [provider, setProvider] = useProvider(config.id);
  const locked = config.requiresPro && !billing.isPro;
  const isConfigured = useIsProviderConfigured(
    config.id,
    providerType,
    providers,
  );

  const showApiKey = providerType === "stt" || config.apiKey;

  const form = useForm({
    onSubmit: ({ value }) => setProvider(value),
    defaultValues:
      provider ??
      ({
        type: providerType,
        base_url: config.baseUrl ?? "",
        api_key: "",
      } satisfies AIProvider),
    listeners: {
      onChange: ({ formApi }) => {
        queueMicrotask(() => {
          formApi.handleSubmit();
        });
      },
    },
    validators: { onChange: aiProviderSchema },
  });

  return (
    <AccordionItem
      disabled={config.disabled || locked}
      value={config.id}
      className={cn([
        "rounded-xl border-2 bg-neutral-50",
        isConfigured ? "border-solid border-neutral-300" : "border-dashed",
      ])}
    >
      <AccordionTrigger
        className={cn([
          "capitalize gap-2 px-4",
          (config.disabled || locked) && "cursor-not-allowed opacity-30",
        ])}
      >
        <div className="flex items-center gap-2">
          {config.icon}
          <span>{config.displayName}</span>
          {config.badge && (
            <span className="text-xs text-neutral-500 font-light border border-neutral-300 rounded-full px-2">
              {config.badge}
            </span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent
        className={cn(["px-4", providerType === "llm" && "space-y-6"])}
      >
        {providerContext}

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
                <FormField field={field} label="Base URL" icon="mdi:web" />
              )}
            </form.Field>
          )}
          {showApiKey && (
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
                    <FormField field={field} label="Base URL" icon="mdi:web" />
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

const streamdownComponents = {
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => {
    return (
      <ul className="list-disc pl-6 mb-1 block relative">
        {props.children as React.ReactNode}
      </ul>
    );
  },
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => {
    return (
      <ol className="list-decimal pl-6 mb-1 block relative">
        {props.children as React.ReactNode}
      </ol>
    );
  },
  li: (props: React.HTMLAttributes<HTMLLIElement>) => {
    return <li className="mb-1">{props.children as React.ReactNode}</li>;
  },
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => {
    return <p className="mb-1">{props.children as React.ReactNode}</p>;
  },
} as const;

export function StyledStreamdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <Streamdown
      components={streamdownComponents}
      className={cn(["text-sm mt-1", className])}
      isAnimating={false}
    >
      {children}
    </Streamdown>
  );
}

function useProvider(id: string) {
  const providerRow = settings.UI.useRow("ai_providers", id, settings.STORE_ID);
  const setProvider = settings.UI.useSetPartialRowCallback(
    "ai_providers",
    id,
    (row: Partial<AIProvider>) => row,
    [id],
    settings.STORE_ID,
  ) as (row: Partial<AIProvider>) => void;

  const { data } = aiProviderSchema.safeParse(providerRow);
  return [data, setProvider] as const;
}

function FormField({
  field,
  label,
  icon,
  placeholder,
  type,
}: {
  field: AnyFieldApi;
  label: string;
  icon: string;
  placeholder?: string;
  type?: string;
}) {
  const {
    meta: { errors, isTouched },
  } = field.state;
  const hasError = isTouched && errors && errors.length > 0;
  const errorMessage = hasError
    ? typeof errors[0] === "string"
      ? errors[0]
      : "message" in errors[0]
        ? errors[0].message
        : JSON.stringify(errors[0])
    : null;

  return (
    <div className="space-y-2">
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
          <Icon icon="mdi:alert-circle" size={14} />
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
}
