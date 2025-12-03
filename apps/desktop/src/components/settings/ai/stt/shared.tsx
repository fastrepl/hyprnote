import { Icon } from "@iconify-icon/react";
import { AssemblyAI, Fireworks } from "@lobehub/icons";
import { queryOptions } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import type {
  AmModel,
  SupportedSttModel,
  WhisperModel,
} from "@hypr/plugin-local-stt";

type Provider = {
  disabled: boolean;
  id: string;
  displayName: string;
  icon: ReactNode;
  baseUrl?: string;
  models: SupportedSttModel[] | string[];
  badge?: string | null;
  requiresPro?: boolean;
};

export type ProviderId = (typeof PROVIDERS)[number]["id"];

export const displayModelId = (model: string) => {
  if (model === "cloud") {
    return "Cloud";
  }

  if (model === "stt-v3") {
    return "Soniox v3";
  }

  if (model === "universal") {
    return "Universal";
  }

  if (model.startsWith("am-")) {
    const am = model as AmModel;
    if (am == "am-parakeet-v2") {
      return "Parakeet V2";
    }
    if (am == "am-parakeet-v3") {
      return "Parakeet V3";
    }
    if (am == "am-whisper-large-v3") {
      return "Whisper Large V3";
    }
  }

  if (model.startsWith("Quantized")) {
    const whisper = model as WhisperModel;
    if (whisper == "QuantizedTinyEn") {
      return "Whisper Tiny (English)";
    }
    if (whisper == "QuantizedSmallEn") {
      return "Whisper Small (English)";
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
    models: [
      "cloud",
      "am-parakeet-v2",
      "am-parakeet-v3",
      "am-whisper-large-v3",
      "QuantizedTinyEn",
      "QuantizedSmallEn",
    ],
    requiresPro: false,
  },
  {
    disabled: false,
    id: "deepgram",
    displayName: "Deepgram",
    icon: <Icon icon="simple-icons:deepgram" className="size-4" />,
    baseUrl: "https://api.deepgram.com/v1",
    models: [
      "nova-3-general",
      "nova-3-medical",
      "nova-2-general",
      "nova-2-meeting",
      "nova-2-phonecall",
      "nova-2-finance",
      "nova-2-conversationalai",
      "nova-2-voicemail",
      "nova-2-video",
      "nova-2-medical",
      "nova-2-drivethru",
      "nova-2-automotive",
      "nova-2-atc",
    ],
    requiresPro: false,
  },
  {
    disabled: false,
    id: "soniox",
    displayName: "Soniox",
    icon: (
      <img src="/assets/soniox.jpeg" alt="Soniox" className="size-5 rounded" />
    ),
    baseUrl: "https://api.soniox.com",
    models: ["stt-v3"],
    requiresPro: false,
  },
  {
    disabled: false,
    id: "assemblyai",
    displayName: "AssemblyAI",
    icon: <AssemblyAI size={16} />,
    baseUrl: "https://api.assemblyai.com",
    models: ["universal"],
    requiresPro: false,
  },
  {
    disabled: false,
    id: "custom",
    displayName: "Custom",
    badge: null,
    icon: <Icon icon="mingcute:random-fill" />,
    baseUrl: undefined,
    models: [],
    requiresPro: false,
  },
  {
    disabled: true,
    id: "fireworks",
    displayName: "Fireworks",
    badge: null,
    icon: <Fireworks size={16} />,
    baseUrl: "https://api.fireworks.ai",
    models: ["Default"],
    requiresPro: false,
  },
] as const satisfies readonly Provider[];

export const sttProviderRequiresPro = (providerId: ProviderId) =>
  PROVIDERS.find((provider) => provider.id === providerId)?.requiresPro ??
  false;

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
