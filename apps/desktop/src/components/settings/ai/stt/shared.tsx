import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import type { AmModel, SupportedSttModel, WhisperModel } from "@hypr/plugin-local-stt";

import { Icon } from "@iconify-icon/react";
import { Fireworks, Groq } from "@lobehub/icons";
import { queryOptions } from "@tanstack/react-query";

export type ProviderId = typeof PROVIDERS[number]["id"];

type ProviderModels = {
  hyprnote: (typeof PROVIDERS)[0]["models"];
  deepgram: (typeof PROVIDERS)[1]["models"];
  custom: (typeof PROVIDERS)[2]["models"];
  groq: (typeof PROVIDERS)[3]["models"];
  fireworks: (typeof PROVIDERS)[4]["models"];
};

type LanguageSupportMap = {
  [K in ProviderId]: Partial<Record<ProviderModels[K][number], string[]>>;
};

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
    models: ["am-parakeet-v2", "am-parakeet-v3", "QuantizedTinyEn", "QuantizedSmallEn"] satisfies SupportedSttModel[],
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

export const LANGUAGE_SUPPORT: LanguageSupportMap = {
  hyprnote: {
    "QuantizedTinyEn": ["en"],
    "QuantizedSmallEn": ["en"],
    "am-parakeet-v2": ["en"],
    "am-parakeet-v3": [
      "en",
      "de",
      "es",
      "fr",
      "nl",
      "it",
      "da",
      "et",
      "fi",
      "el",
      "hu",
      "lv",
      "lt",
      "mt",
      "pl",
      "pt",
      "ro",
      "sk",
      "sl",
      "sv",
      "ru",
      "uk",
      "bg",
      "hr",
      "cs",
    ],
  },
  deepgram: {
    // https://developers.deepgram.com/docs/models-languages-overview#nova-3
    "nova-3-general": [
      "en",
      "en-US",
      "en-AU",
      "en-GB",
      "en-IN",
      "en-NZ",
      "de",
      "nl",
      "sv",
      "sv-SE",
      "da",
      "da-DK",
      "es",
      "es-419",
      "fr",
      "fr-CA",
      "pt",
      "pt-BR",
      "pt-PT",
      "it",
      "tr",
      "no",
      "id",
    ],
    "nova-3-medical": [
      "en",
      "en-US",
      "en-AU",
      "en-CA",
      "en-GB",
      "en-IE",
      "en-IN",
      "en-NZ",
    ],
    // https://developers.deepgram.com/docs/models-languages-overview#nova-2
    "nova-2-general": [
      "bg",
      "ca",
      "zh",
      "zh-CN",
      "zh-Hans",
      "zh-TW",
      "zh-Hant",
      "zh-HK",
      "cs",
      "da",
      "da-DK",
      "nl",
      "en",
      "en-US",
      "en-AU",
      "en-GB",
      "en-NZ",
      "en-IN",
      "et",
      "fi",
      "nl-BE",
      "fr",
      "fr-CA",
      "de",
      "de-CH",
      "el",
      "hi",
      "hu",
      "id",
      "it",
      "ja",
      "ko",
      "ko-KR",
      "lv",
      "lt",
      "ms",
      "no",
      "pl",
      "pt",
      "pt-BR",
      "pt-PT",
      "ro",
      "ru",
      "sk",
      "es",
      "es-419",
      "sv",
      "sv-SE",
      "th",
      "th-TH",
      "tr",
      "uk",
      "vi",
    ],
    "nova-2-meeting": ["en", "en-US"],
    "nova-2-phonecall": ["en", "en-US"],
    "nova-2-finance": ["en", "en-US"],
    "nova-2-conversationalai": ["en", "en-US"],
    "nova-2-voicemail": ["en", "en-US"],
    "nova-2-video": ["en", "en-US"],
    "nova-2-medical": ["en", "en-US"],
    "nova-2-drivethru": ["en", "en-US"],
    "nova-2-automotive": ["en", "en-US"],
    "nova-2-atc": ["en", "en-US"],
  },
  custom: {},
  groq: {},
  fireworks: {},
};

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
