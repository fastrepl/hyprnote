import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import {
  extractReasoningMiddleware,
  type LanguageModel,
  wrapLanguageModel,
} from "ai";
import { useMemo } from "react";

import type { AIProviderStorage, Credentials } from "@hypr/store";
import { credentialsSchema } from "@hypr/store";

import { useAuth } from "../auth";
import { useBillingAccess } from "../billing";
import {
  type ProviderId,
  PROVIDERS,
} from "../components/settings/ai/llm/shared";
import {
  type ConfigField,
  getProviderSelectionBlockers,
  type ProviderEligibilityContext,
} from "../components/settings/ai/shared/eligibility";
import { env } from "../env";
import * as settings from "../store/tinybase/store/settings";
import { tracedFetch } from "../utils/traced-fetch";

type LLMConnectionInfo = {
  providerId: ProviderId;
  modelId: string;
  baseUrl: string;
  apiKey: string;
  // Bedrock-specific credentials
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
};

export type LLMConnectionStatus =
  | { status: "pending"; reason: "missing_provider" }
  | { status: "pending"; reason: "missing_model"; providerId: ProviderId }
  | { status: "error"; reason: "provider_not_found"; providerId: string }
  | { status: "error"; reason: "unauthenticated"; providerId: "hyprnote" }
  | { status: "error"; reason: "not_pro"; providerId: "hyprnote" }
  | {
      status: "error";
      reason: "missing_config";
      providerId: ProviderId;
      missing: ConfigField[];
    }
  | { status: "success"; providerId: ProviderId; isHosted: boolean };

type LLMConnectionResult = {
  conn: LLMConnectionInfo | null;
  status: LLMConnectionStatus;
};

export const useLanguageModel = (): Exclude<LanguageModel, string> | null => {
  const { conn } = useLLMConnection();
  return useMemo(() => (conn ? createLanguageModel(conn) : null), [conn]);
};

export const useLLMConnection = (): LLMConnectionResult => {
  const auth = useAuth();
  const billing = useBillingAccess();

  const { current_llm_provider, current_llm_model } = settings.UI.useValues(
    settings.STORE_ID,
  );
  const providerConfig = settings.UI.useRow(
    "ai_providers",
    current_llm_provider ?? "",
    settings.STORE_ID,
  ) as AIProviderStorage | undefined;

  return useMemo<LLMConnectionResult>(
    () =>
      resolveLLMConnection({
        providerId: current_llm_provider,
        modelId: current_llm_model,
        providerConfig,
        session: auth?.session,
        isPro: billing.isPro,
      }),
    [
      auth,
      billing.isPro,
      current_llm_model,
      current_llm_provider,
      providerConfig,
    ],
  );
};

export const useLLMConnectionStatus = (): LLMConnectionStatus => {
  const { status } = useLLMConnection();
  return status;
};

function parseCredentials(
  credentialsJson: string | undefined,
): Credentials | null {
  if (!credentialsJson) return null;
  try {
    const parsed = JSON.parse(credentialsJson);
    const result = credentialsSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

const resolveLLMConnection = (params: {
  providerId: string | undefined;
  modelId: string | undefined;
  providerConfig: AIProviderStorage | undefined;
  session: { access_token: string } | null | undefined;
  isPro: boolean;
}): LLMConnectionResult => {
  const {
    providerId: rawProviderId,
    modelId,
    providerConfig,
    session,
    isPro,
  } = params;

  if (!rawProviderId) {
    return {
      conn: null,
      status: { status: "pending", reason: "missing_provider" },
    };
  }

  const providerId = rawProviderId as ProviderId;

  if (!modelId) {
    return {
      conn: null,
      status: { status: "pending", reason: "missing_model", providerId },
    };
  }

  const providerDefinition = PROVIDERS.find((p) => p.id === rawProviderId);

  if (!providerDefinition) {
    return {
      conn: null,
      status: {
        status: "error",
        reason: "provider_not_found",
        providerId: rawProviderId,
      },
    };
  }

  const credentials = parseCredentials(providerConfig?.credentials);

  let baseUrl = providerDefinition.baseUrl?.trim() || "";
  let apiKey = "";
  let accessKeyId = "";
  let secretAccessKey = "";
  let region = "";

  if (credentials?.type === "api_key") {
    baseUrl = credentials.base_url?.trim() || baseUrl;
    apiKey = credentials.api_key?.trim() || "";
  } else if (credentials?.type === "aws") {
    accessKeyId = credentials.access_key_id?.trim() || "";
    secretAccessKey = credentials.secret_access_key?.trim() || "";
    region = credentials.region?.trim() || "";
  }

  const context: ProviderEligibilityContext = {
    isAuthenticated: !!session,
    isPro,
    credentials,
  };

  const blockers = getProviderSelectionBlockers(
    providerDefinition.requirements,
    context,
  );

  if (blockers.length > 0) {
    const blocker = blockers[0];
    if (blocker.code === "requires_auth" && providerId === "hyprnote") {
      return {
        conn: null,
        status: { status: "error", reason: "unauthenticated", providerId },
      };
    }
    if (blocker.code === "requires_entitlement" && providerId === "hyprnote") {
      return {
        conn: null,
        status: { status: "error", reason: "not_pro", providerId },
      };
    }
    if (blocker.code === "missing_config") {
      return {
        conn: null,
        status: {
          status: "error",
          reason: "missing_config",
          providerId,
          missing: blocker.fields,
        },
      };
    }
  }

  if (providerId === "hyprnote" && session) {
    return {
      conn: {
        providerId,
        modelId,
        baseUrl: baseUrl || new URL("/llm", env.VITE_AI_URL).toString(),
        apiKey: session.access_token,
      },
      status: { status: "success", providerId, isHosted: true },
    };
  }

  return {
    conn: {
      providerId,
      modelId,
      baseUrl,
      apiKey,
      accessKeyId,
      secretAccessKey,
      region,
    },
    status: { status: "success", providerId, isHosted: false },
  };
};

const wrapWithThinkingMiddleware = (model: Exclude<LanguageModel, string>) => {
  return wrapLanguageModel({
    model,
    middleware: [
      extractReasoningMiddleware({ tagName: "think" }),
      extractReasoningMiddleware({ tagName: "thinking" }),
    ],
  });
};

const createLanguageModel = (
  conn: LLMConnectionInfo,
): Exclude<LanguageModel, string> => {
  switch (conn.providerId) {
    case "hyprnote": {
      const provider = createOpenAICompatible({
        fetch: tracedFetch,
        name: "hyprnote",
        baseURL: conn.baseUrl,
        apiKey: conn.apiKey,
        headers: {
          Authorization: `Bearer ${conn.apiKey}`,
        },
      });
      return wrapWithThinkingMiddleware(provider.chatModel(conn.modelId));
    }

    case "anthropic": {
      const provider = createAnthropic({
        fetch: tauriFetch,
        apiKey: conn.apiKey,
        headers: {
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
      });
      return wrapWithThinkingMiddleware(provider(conn.modelId));
    }

    case "google_generative_ai": {
      const provider = createGoogleGenerativeAI({
        fetch: tauriFetch,
        baseURL: conn.baseUrl,
        apiKey: conn.apiKey,
      });
      return wrapWithThinkingMiddleware(provider(conn.modelId));
    }

    case "openrouter": {
      const provider = createOpenRouter({
        fetch: tauriFetch,
        apiKey: conn.apiKey,
      });
      // Type cast needed due to @ai-sdk/mistral using @ai-sdk/provider@3.x while @openrouter uses @2.x
      return wrapWithThinkingMiddleware(
        provider(conn.modelId) as Exclude<LanguageModel, string>,
      );
    }

    case "openai": {
      const provider = createOpenAI({
        fetch: tauriFetch,
        apiKey: conn.apiKey,
      });
      return wrapWithThinkingMiddleware(provider(conn.modelId));
    }

    case "amazon_bedrock": {
      const provider = createAmazonBedrock({
        region: conn.region || "us-east-1",
        accessKeyId: conn.accessKeyId,
        secretAccessKey: conn.secretAccessKey,
      });
      return wrapWithThinkingMiddleware(provider(conn.modelId));
    }

    case "ollama": {
      const ollamaOrigin = new URL(conn.baseUrl.replace(/\/v1\/?$/, "")).origin;
      const ollamaFetch: typeof fetch = async (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("Origin", ollamaOrigin);
        return tauriFetch(input as RequestInfo | URL, {
          ...init,
          headers,
        });
      };
      const provider = createOpenAICompatible({
        fetch: ollamaFetch,
        name: conn.providerId,
        baseURL: conn.baseUrl,
      });
      return wrapWithThinkingMiddleware(provider.chatModel(conn.modelId));
    }

    default: {
      const config: Parameters<typeof createOpenAICompatible>[0] = {
        fetch: tauriFetch,
        name: conn.providerId,
        baseURL: conn.baseUrl,
      };
      if (conn.apiKey) {
        config.apiKey = conn.apiKey;
      }
      const provider = createOpenAICompatible(config);
      return wrapWithThinkingMiddleware(provider.chatModel(conn.modelId));
    }
  }
};
