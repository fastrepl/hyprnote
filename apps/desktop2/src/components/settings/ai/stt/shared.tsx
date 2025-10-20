import { Icon } from "@iconify-icon/react";
import { Fireworks, Groq } from "@lobehub/icons";
import { queryOptions } from "@tanstack/react-query";

import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import type { AmModel, SupportedSttModel } from "@hypr/plugin-local-stt";

export type ProviderId = typeof PROVIDERS[number]["id"];

export const displayModelId = (model: string) => {
  if (model.startsWith("am-")) {
    const am = model as AmModel;
    if (am == "am-parakeet-v2") {
      return "Parakeet V2";
    }
    if (am == "am-parakeet-v3") {
      return "Parakeet V3";
    }
  }

  return model;
};

export const PROVIDERS = [
  {
    disabled: false,
    id: "hyprnote",
    displayName: "Hyprnote",
    icon: <img src="/assets/icon.png" alt="Hyprnote" className="size-5" />,
    baseUrl: { value: "https://api.hyprnote.com/v1", immutable: true },
    models: ["am-parakeet-v2", "am-parakeet-v3"] satisfies SupportedSttModel[],
  },
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

export const sttModelQueries = {
  isDownloaded: (model: SupportedSttModel) =>
    queryOptions({
      queryKey: ["stt", "model", model, "downloaded"],
      queryFn: () => localSttCommands.isModelDownloaded(model),
      refetchInterval: 1500,
    }),
  isDownloading: (model: SupportedSttModel) =>
    queryOptions({
      queryKey: ["stt", "model", model, "downloading"],
      queryFn: () => localSttCommands.isModelDownloading(model),
      refetchInterval: 500,
    }),
};
