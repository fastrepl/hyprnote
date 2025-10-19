import { Icon } from "@iconify-icon/react";

export type ProviderId = "hyprnote" | typeof CUSTOM_PROVIDERS[number]["id"];

export const CUSTOM_PROVIDERS = [
  {
    id: "deepgram",
    displayName: "Deepgram",
    icon: <Icon icon="simple-icons:deepgram" className="size-4" />,
    baseUrl: { value: "https://api.deepgram.com/v1", immutable: true },
    models: ["nova-3", "nova-3-general", "nova-3-medical"],
  },
  {
    id: "deepgram-custom",
    displayName: "Deepgram (Custom)",
    badge: null,
    icon: <Icon icon="simple-icons:deepgram" className="size-4" />,
    baseUrl: { value: "https://api.openai.com/v1", immutable: false },
    models: ["nova-3", "nova-3-general", "nova-3-medical"],
  },
] as const;
