import { Anthropic, LmStudio, Ollama, OpenAI, OpenRouter } from "@lobehub/icons";

export type ProviderId = typeof PROVIDERS[number]["id"];

export const PROVIDERS = [
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
    id: "openrouter",
    displayName: "OpenRouter",
    badge: null,
    icon: <OpenRouter size={16} />,
    apiKey: true,
    baseUrl: { value: "https://openrouter.ai/api/v1", immutable: true },
  },
  {
    id: "ollama",
    displayName: "Ollama",
    badge: null,
    icon: <Ollama size={16} />,
    apiKey: false,
    baseUrl: { value: "http://localhost:11434", immutable: false },
  },
  {
    id: "lmstudio",
    displayName: "LM Studio",
    badge: null,
    icon: <LmStudio size={16} />,
    apiKey: false,
    baseUrl: { value: "http://localhost:8000", immutable: false },
  },
];
