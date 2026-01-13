import { Icon } from "@iconify-icon/react";
import { type AnyFieldApi, useForm } from "@tanstack/react-form";
import type { ReactNode } from "react";
import { Streamdown } from "streamdown";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import type { AIProvider, Credentials } from "@hypr/store";
import { parseCredentials } from "@hypr/store";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";
import {
  InputGroup,
  InputGroupInput,
} from "@hypr/ui/components/ui/input-group";
import { cn } from "@hypr/utils";

import { useBillingAccess } from "../../../../billing";
import * as settings from "../../../../store/tinybase/store/settings";
import {
  getProviderSelectionBlockers,
  getRequiredConfigFields,
  type ProviderRequirement,
  requiresEntitlement,
} from "./eligibility";

export * from "./model-combobox";

type ProviderType = "stt" | "llm";

type ProviderConfig = {
  id: string;
  displayName: string;
  icon: ReactNode;
  badge?: string | null;
  baseUrl?: string;
  disabled?: boolean;
  requirements: ProviderRequirement[];
};

function useIsProviderConfigured(
  providerId: string,
  providerType: ProviderType,
  providers: readonly ProviderConfig[],
) {
  const billing = useBillingAccess();
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

  if (!providerDef) {
    return false;
  }

  const credentials = parseCredentials(config?.credentials as string);
  const baseUrl = (config?.base_url as string) || "";

  return (
    getProviderSelectionBlockers(providerDef.requirements, {
      isAuthenticated: true,
      isPro: billing.isPro,
      baseUrl,
      credentials,
    }).length === 0
  );
}

type FormValues = {
  type: "stt" | "llm";
  credentials_type: "api_key" | "aws";
  base_url: string;
  api_key: string;
  access_key_id: string;
  secret_access_key: string;
  region: string;
};

function normalizeBaseUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      return undefined;
    }
  }

  const isProbablyLocal =
    trimmed.startsWith("localhost") ||
    trimmed.startsWith("127.") ||
    trimmed.startsWith("0.0.0.0") ||
    trimmed.startsWith("[::1]") ||
    trimmed.endsWith(".local") ||
    /^[^/]+:\d+/.test(trimmed);

  const withScheme = `${isProbablyLocal ? "http" : "https"}://${trimmed}`;
  try {
    new URL(withScheme);
    return withScheme;
  } catch {
    return undefined;
  }
}

function credentialsToFormValues(
  credentials: Credentials | null,
  providerType: ProviderType,
  providerRequirements: readonly ProviderRequirement[],
  configuredBaseUrl?: string,
  defaultBaseUrl?: string,
): FormValues {
  const requiredFields = getRequiredConfigFields(providerRequirements);
  const requiresAws = requiredFields.some((f) =>
    ["access_key_id", "secret_access_key", "region"].includes(f),
  );

  if (!credentials) {
    return {
      type: providerType,
      credentials_type: requiresAws ? "aws" : "api_key",
      base_url: configuredBaseUrl ?? defaultBaseUrl ?? "",
      api_key: "",
      access_key_id: "",
      secret_access_key: "",
      region: "",
    };
  }
  if (credentials.type === "aws") {
    return {
      type: providerType,
      credentials_type: "aws",
      base_url: "",
      api_key: "",
      access_key_id: credentials.access_key_id,
      secret_access_key: credentials.secret_access_key,
      region: credentials.region,
    };
  }
  return {
    type: providerType,
    credentials_type: "api_key",
    base_url: configuredBaseUrl ?? defaultBaseUrl ?? "",
    api_key: credentials.api_key,
    access_key_id: "",
    secret_access_key: "",
    region: "",
  };
}

function formValuesToProvider(
  values: FormValues,
  defaultBaseUrl?: string,
): AIProvider {
  if (values.credentials_type === "aws") {
    return {
      type: values.type,
      credentials: {
        type: "aws",
        access_key_id: values.access_key_id.trim(),
        secret_access_key: values.secret_access_key.trim(),
        region: values.region.trim(),
      },
    };
  }

  const normalizedBaseUrl = normalizeBaseUrl(values.base_url);
  const normalizedDefaultBaseUrl = defaultBaseUrl
    ? normalizeBaseUrl(defaultBaseUrl)
    : undefined;

  const shouldStoreBaseUrl =
    normalizedBaseUrl &&
    (!normalizedDefaultBaseUrl ||
      normalizedBaseUrl !== normalizedDefaultBaseUrl);

  return {
    type: values.type,
    base_url: shouldStoreBaseUrl ? normalizedBaseUrl : undefined,
    credentials: {
      type: "api_key",
      api_key: values.api_key.trim(),
    },
  };
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
  const [credentials, configuredBaseUrl, setProvider] = useProvider(
    config.id,
    providerType,
  );
  const locked =
    requiresEntitlement(config.requirements, "pro") && !billing.isPro;
  const isConfigured = useIsProviderConfigured(
    config.id,
    providerType,
    providers,
  );

  const requiredFields = getRequiredConfigFields(config.requirements);
  const showApiKey = requiredFields.includes("api_key");
  const showBaseUrl = requiredFields.includes("base_url");
  const showAccessKeyId = requiredFields.includes("access_key_id");
  const showSecretAccessKey = requiredFields.includes("secret_access_key");
  const showRegion = requiredFields.includes("region");

  const form = useForm({
    onSubmit: ({ value }) => {
      void analyticsCommands.event({
        event: "ai_provider_configured",
        provider: value.type,
      });
      setProvider(formValuesToProvider(value, config.baseUrl));
    },
    defaultValues: credentialsToFormValues(
      credentials,
      providerType,
      config.requirements,
      configuredBaseUrl,
      config.baseUrl,
    ),
    listeners: {
      onChange: ({ formApi }) => {
        queueMicrotask(() => {
          void formApi.handleSubmit();
        });
      },
    },
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
          {showBaseUrl && (
            <form.Field name="base_url">
              {(field) => <FormField field={field} label="Base URL" />}
            </form.Field>
          )}
          {showApiKey && (
            <form.Field name="api_key">
              {(field) => (
                <FormField
                  field={field}
                  label="API Key"
                  placeholder="Enter your API key"
                  type="password"
                />
              )}
            </form.Field>
          )}
          {showAccessKeyId && (
            <form.Field name="access_key_id">
              {(field) => (
                <FormField
                  field={field}
                  label="Access Key ID"
                  placeholder="Enter your AWS Access Key ID"
                />
              )}
            </form.Field>
          )}
          {showSecretAccessKey && (
            <form.Field name="secret_access_key">
              {(field) => (
                <FormField
                  field={field}
                  label="Secret Access Key"
                  placeholder="Enter your AWS Secret Access Key"
                  type="password"
                />
              )}
            </form.Field>
          )}
          {showRegion && (
            <form.Field name="region">
              {(field) => (
                <FormField
                  field={field}
                  label="Region"
                  placeholder="e.g., us-east-1"
                />
              )}
            </form.Field>
          )}
          {!showBaseUrl && config.baseUrl && (
            <details className="space-y-4 pt-2">
              <summary className="text-xs cursor-pointer text-neutral-600 hover:text-neutral-900 hover:underline">
                Advanced
              </summary>
              <div className="mt-4">
                <form.Field name="base_url">
                  {(field) => <FormField field={field} label="Base URL" />}
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

function useProvider(id: string, providerType: ProviderType) {
  const providerRow = settings.UI.useRow("ai_providers", id, settings.STORE_ID);
  const setRow = settings.UI.useSetRowCallback(
    "ai_providers",
    id,
    (row: { type: string; base_url: string; credentials: string }) => row,
    [id],
    settings.STORE_ID,
  );

  const credentials = parseCredentials(providerRow?.credentials as string);
  const baseUrl = (providerRow?.base_url as string) || undefined;

  const setProvider = (provider: AIProvider) => {
    setRow({
      type: providerType,
      base_url: provider.base_url ?? "",
      credentials: JSON.stringify(provider.credentials),
    });
  };

  return [credentials, baseUrl, setProvider] as const;
}

function FormField({
  field,
  label,
  placeholder,
  type,
}: {
  field: AnyFieldApi;
  label: string;
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
