import { Icon } from "@iconify-icon/react";
import {
  Anthropic,
  LmStudio,
  Ollama,
  OpenAI,
  OpenRouter,
} from "@lobehub/icons";
import type { ReactNode } from "react";

import type { ProviderRequirement } from "../shared/eligibility";

type Provider = {
  id: string;
  displayName: string;
  badge: string | null;
  icon: ReactNode;
  apiKey: boolean;
  baseUrl?: string;
  requiresPro?: boolean;
  requirements: ProviderRequirement[];
};

export type ProviderId = (typeof PROVIDERS)[number]["id"];

export const PROVIDERS = [
  {
    id: "hyprnote",
    displayName: "Hyprnote",
    badge: "Recommended",
    icon: <img src="/assets/icon.png" alt="Hyprnote" className="size-5" />,
    apiKey: false,
    baseUrl: "",
    requiresPro: true,
    requirements: [
      { kind: "requires_auth" },
      { kind: "requires_entitlement", entitlement: "pro" },
    ],
  },
  {
    id: "openrouter",
    displayName: "OpenRouter",
    badge: null,
    icon: <OpenRouter size={16} />,
    apiKey: true,
    baseUrl: "https://openrouter.ai/api/v1",
    requiresPro: false,
    requirements: [{ kind: "requires_config", fields: ["api_key"] }],
  },
  {
    id: "openai",
    displayName: "OpenAI",
    badge: null,
    icon: <OpenAI size={16} />,
    apiKey: true,
    baseUrl: "https://api.openai.com/v1",
    requiresPro: false,
    requirements: [{ kind: "requires_config", fields: ["api_key"] }],
  },
  {
    id: "anthropic",
    displayName: "Anthropic",
    badge: null,
    icon: <Anthropic size={16} />,
    apiKey: true,
    baseUrl: "https://api.anthropic.com/v1",
    requiresPro: false,
    requirements: [{ kind: "requires_config", fields: ["api_key"] }],
  },
  {
    id: "google_generative_ai",
    displayName: "Google Gemini",
    badge: null,
    icon: <Icon icon="simple-icons:googlegemini" width={16} />,
    apiKey: true,
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    requiresPro: false,
    requirements: [{ kind: "requires_config", fields: ["api_key"] }],
  },
  {
    id: "custom",
    displayName: "Custom",
    badge: null,
    icon: <Icon icon="mingcute:random-fill" />,
    apiKey: true,
    baseUrl: undefined,
    requiresPro: false,
    requirements: [
      { kind: "requires_config", fields: ["base_url", "api_key"] },
    ],
  },
  {
    id: "lmstudio",
    displayName: "LM Studio",
    badge: null,
    icon: <LmStudio size={16} />,
    apiKey: false,
    baseUrl: "http://127.0.0.1:1234/v1",
    requiresPro: false,
    requirements: [],
  },
  {
    id: "ollama",
    displayName: "Ollama",
    badge: null,
    icon: <Ollama size={16} />,
    apiKey: false,
    baseUrl: "http://127.0.0.1:11434/v1",
    requiresPro: false,
    requirements: [],
  },
] as const satisfies readonly Provider[];

export const llmProviderRequiresPro = (providerId: ProviderId) =>
  PROVIDERS.find((provider) => provider.id === providerId)?.requiresPro ??
  false;
