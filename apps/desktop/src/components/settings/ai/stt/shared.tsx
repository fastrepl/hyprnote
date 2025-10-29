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
    baseUrl: "https://api.hyprnote.com/v1",
    models: ["am-parakeet-v2", "am-parakeet-v3"] satisfies SupportedSttModel[],
  },
  {
    disabled: false,
    id: "deepgram",
    displayName: "Deepgram",
    icon: <Icon icon="simple-icons:deepgram" className="size-4" />,
    baseUrl: "https://api.deepgram.com/v1",
    models: ["nova-3", "nova-3-general", "nova-3-medical"],
  },
  {
    disabled: false,
    id: "custom",
    displayName: "Custom",
    badge: null,
    icon: <Icon icon="mingcute:random-fill" />,
    baseUrl: undefined,
    models: [],
  },
  {
    disabled: true,
    id: "groq",
    displayName: "Groq",
    badge: null,
    icon: <Groq size={16} />,
    baseUrl: "https://api.groq.com/v1",
    models: ["whisper-large-v3-turbo", "whisper-large-v3"],
  },
  {
    disabled: true,
    id: "fireworks",
    displayName: "Fireworks",
    badge: null,
    icon: <Fireworks size={16} />,
    baseUrl: "https://api.firework.ai/v1",
    models: ["whisper-large-v3-turbo", "whisper-large-v3"],
  },
] as const;

export const sttModelQueries = {
  isDownloaded: (model: SupportedSttModel) =>
    queryOptions({
      refetchInterval: 1000,
      queryKey: ["stt", "model", model, "downloaded"],
      queryFn: () => localSttCommands.isModelDownloaded(model),
      select: (result) => {
        if (result.status === "error") {
          throw new Error(result.error);
        }

        return result.data;
      },
    }),
  isDownloading: (model: SupportedSttModel) =>
    queryOptions({
      refetchInterval: 1000,
      queryKey: ["stt", "model", model, "downloading"],
      queryFn: () => localSttCommands.isModelDownloading(model),
      select: (result) => {
        if (result.status === "error") {
          throw new Error(result.error);
        }

        return result.data;
      },
    }),
};
