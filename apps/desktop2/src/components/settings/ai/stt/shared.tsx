import { Icon } from "@iconify-icon/react";
import { Fireworks, Groq } from "@lobehub/icons";

export type ProviderId = "hyprnote" | typeof CUSTOM_PROVIDERS[number]["id"];

export const CUSTOM_PROVIDERS = [
  {
    disabled: false,
    id: "deepgram",
    displayName: "Deepgram",
    icon: <Icon icon="simple-icons:deepgram" className="size-4" />,
    baseUrl: { value: "https://api.deepgram.com/v1", immutable: true },
    models: ["nova-3", "nova-3-general", "nova-3-medical"],
  },
  {
    disabled: false,
    id: "deepgram-custom",
    displayName: "Deepgram (Custom)",
    badge: null,
    icon: <Icon icon="simple-icons:deepgram" className="size-4" />,
    baseUrl: { value: "https://api.openai.com/v1", immutable: false },
    models: ["nova-3", "nova-3-general", "nova-3-medical"],
  },
  {
    disabled: true,
    id: "groq",
    displayName: "Groq",
    badge: null,
    icon: <Groq size={16} />,
    baseUrl: { value: "https://api.groq.com/v1", immutable: false },
    models: ["whisper-large-v3-turbo", "whisper-large-v3"],
  },
  {
    disabled: true,
    id: "fireworks",
    displayName: "Fireworks",
    badge: null,
    icon: <Fireworks size={16} />,
    baseUrl: { value: "https://api.firework.ai/v1", immutable: false },
    models: ["whisper-large-v3-turbo", "whisper-large-v3"],
  },
] as const;
