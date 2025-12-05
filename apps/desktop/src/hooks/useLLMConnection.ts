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

import type { AIProviderStorage } from "@hypr/store";

import { useAuth } from "../auth";
import { useBillingAccess } from "../billing";
import {
  type ProviderId,
  PROVIDERS,
} from "../components/settings/ai/llm/shared";
import { env } from "../env";
import * as main from "../store/tinybase/main";
import { tracedFetch } from "../utils/traced-fetch";

type LLMConnectionInfo = {
  providerId: ProviderId;
  modelId: string;
  baseUrl: string;
  apiKey: string;
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
      missing: Array<"base_url" | "api_key">;
    }
  | { status: "success"; providerId: ProviderId; isHosted: boolean };

type LLMConnectionResult = {
  conn: LLMConnectionInfo | null;
  status: LLMConnectionStatus;
};

export const useLanguageModel = (): Exclude<LanguageModel, string> | null => {
  const { conn } = useLLMConnection();

  return useMemo(() => {
    if (!conn) {
      return null;
    }

    if (conn.providerId === "hyprnote") {
      const hyprnoteProvider = createOpenAICompatible({
        fetch: tracedFetch,
        name: "hyprnote",
        baseURL: conn.baseUrl,
        apiKey: conn.apiKey,
        headers: {
          Authorization: `Bearer ${conn.apiKey}`,
        },
      });

      return wrapWithThinkingMiddleware(
        hyprnoteProvider.chatModel(conn.modelId),
      );
    }

    if (conn.providerId === "anthropic") {
      const anthropicProvider = createAnthropic({
        fetch: tauriFetch,
        apiKey: conn.apiKey,
        headers: {
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
      });

      return wrapWithThinkingMiddleware(anthropicProvider(conn.modelId));
    }

    if (conn.providerId === "google_generative_ai") {
      const googleProvider = createGoogleGenerativeAI({
        fetch: tauriFetch,
        baseURL: conn.baseUrl,
        apiKey: conn.apiKey,
      });

      return wrapWithThinkingMiddleware(googleProvider(conn.modelId));
    }

    if (conn.providerId === "openrouter") {
      const openRouterProvider = createOpenRouter({
        fetch: tauriFetch,
        apiKey: conn.apiKey,
        extraBody: {
          provider: {
            // https://openrouter.ai/docs/features/provider-routing#provider-sorting
            sort: "latency",
          },
        },
      });

      return wrapWithThinkingMiddleware(openRouterProvider(conn.modelId));
    }

    if (conn.providerId === "openai") {
      const openAIProvider = createOpenAI({
        fetch: tauriFetch,
        apiKey: conn.apiKey,
      });

      return wrapWithThinkingMiddleware(openAIProvider(conn.modelId));
    }

    const config: Parameters<typeof createOpenAICompatible>[0] = {
      fetch: tauriFetch,
      name: conn.providerId,
      baseURL: conn.baseUrl,
    };

    if (conn.apiKey) {
      config.apiKey = conn.apiKey;
    }

    const openAICompatibleProvider = createOpenAICompatible(config);

    return wrapWithThinkingMiddleware(
      openAICompatibleProvider.chatModel(conn.modelId),
    );
  }, [conn]);
};

export const useLLMConnection = (): LLMConnectionResult => {
  const auth = useAuth();
  const billing = useBillingAccess();

  const { current_llm_provider, current_llm_model } = main.UI.useValues(
    main.STORE_ID,
  );
  const providerConfig = main.UI.useRow(
    "ai_providers",
    current_llm_provider ?? "",
    main.STORE_ID,
  ) as AIProviderStorage | undefined;

  return useMemo<LLMConnectionResult>(() => {
    if (!current_llm_provider) {
      return {
        conn: null,
        status: { status: "pending", reason: "missing_provider" },
      };
    }

    const providerId = current_llm_provider as ProviderId;

    if (!current_llm_model) {
      return {
        conn: null,
        status: {
          status: "pending",
          reason: "missing_model",
          providerId,
        },
      };
    }

    const providerDefinition = PROVIDERS.find(
      (provider) => provider.id === current_llm_provider,
    );

    if (!providerDefinition) {
      return {
        conn: null,
        status: {
          status: "error",
          reason: "provider_not_found",
          providerId: current_llm_provider,
        },
      };
    }

    if (providerId === "hyprnote") {
      if (!auth?.session) {
        return {
          conn: null,
          status: { status: "error", reason: "unauthenticated", providerId },
        };
      }

      if (!billing.isPro) {
        return {
          conn: null,
          status: { status: "error", reason: "not_pro", providerId },
        };
      }

      const conn: LLMConnectionInfo = {
        providerId,
        modelId: current_llm_model,
        baseUrl: `${env.VITE_API_URL}`,
        apiKey: auth.session.access_token,
      };

      return {
        conn,
        status: { status: "success", providerId, isHosted: true },
      };
    }

    const baseUrl =
      providerConfig?.base_url?.trim() ||
      providerDefinition.baseUrl?.trim() ||
      "";
    const apiKey = providerConfig?.api_key?.trim() || "";

    const missing: Array<"base_url" | "api_key"> = [];

    if (!baseUrl) {
      missing.push("base_url");
    }

    if (providerDefinition.apiKey && !apiKey) {
      missing.push("api_key");
    }

    if (missing.length > 0) {
      return {
        conn: null,
        status: {
          status: "error",
          reason: "missing_config",
          providerId,
          missing,
        },
      };
    }

    const conn: LLMConnectionInfo = {
      providerId,
      modelId: current_llm_model,
      baseUrl,
      apiKey,
    };

    return {
      conn,
      status: { status: "success", providerId, isHosted: false },
    };
  }, [
    auth,
    billing.isPro,
    current_llm_model,
    current_llm_provider,
    providerConfig,
  ]);
};

export const useLLMConnectionStatus = (): LLMConnectionStatus => {
  const { status } = useLLMConnection();
  return status;
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
