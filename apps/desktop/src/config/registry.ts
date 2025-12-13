import { invoke } from "@tauri-apps/api/core";
import { disable, enable } from "@tauri-apps/plugin-autostart";

import { commands as detectCommands } from "@hypr/plugin-detect";
import {
  commands as localSttCommands,
  type SupportedSttModel,
} from "@hypr/plugin-local-stt";

export type ConfigKey =
  | "autostart"
  | "notification_detect"
  | "notification_event"
  | "respect_dnd"
  | "ignored_platforms"
  | "dismissed_banners"
  | "quit_intercept"
  | "current_stt_provider"
  | "current_stt_model"
  | "ai_language"
  | "spoken_languages"
  | "save_recordings"
  | "telemetry_consent"
  | "current_llm_provider"
  | "current_llm_model"
  | "vibrancy_enabled"
  | "vibrancy_material"
  | "vibrancy_radius";

type ConfigValueType<K extends ConfigKey> =
  (typeof CONFIG_REGISTRY)[K]["default"];

interface ConfigDefinition<T = any> {
  key: ConfigKey;
  default: T;
  sideEffect?: (
    value: T,
    getConfig: <K extends ConfigKey>(key: K) => ConfigValueType<K>,
  ) => void | Promise<void>;
}

export const CONFIG_REGISTRY = {
  autostart: {
    key: "autostart",
    default: false,
    sideEffect: async (value: boolean, _) => {
      if (value) {
        await enable();
      } else {
        await disable();
      }
    },
  },

  notification_detect: {
    key: "notification_detect",
    default: true,
  },

  notification_event: {
    key: "notification_event",
    default: true,
  },

  respect_dnd: {
    key: "respect_dnd",
    default: false,
    sideEffect: async (value: boolean, _) => {
      await detectCommands.setRespectDoNotDisturb(value);
    },
  },

  ignored_platforms: {
    key: "ignored_platforms",
    default: [] as string[],
    sideEffect: async (value: string[], _) => {
      await detectCommands.setIgnoredBundleIds(value);
    },
  },

  dismissed_banners: {
    key: "dismissed_banners",
    default: [] as string[],
  },

  quit_intercept: {
    key: "quit_intercept",
    default: false,
    sideEffect: async (reallyQuit: boolean, _) => {
      await detectCommands.setQuitHandler(reallyQuit);
    },
  },

  current_stt_provider: {
    key: "current_stt_provider",
    default: undefined,
    sideEffect: async (_value: string | undefined, getConfig) => {
      const provider = getConfig("current_stt_provider") as string | undefined;
      const model = getConfig("current_stt_model") as string | undefined;

      if (
        provider === "hyprnote" &&
        model &&
        model !== "cloud" &&
        (model.startsWith("am-") || model.startsWith("Quantized"))
      ) {
        await localSttCommands.startServer(model as SupportedSttModel);
      }
    },
  },

  current_stt_model: {
    key: "current_stt_model",
    default: undefined,
    sideEffect: async (_value: string | undefined, getConfig) => {
      const provider = getConfig("current_stt_provider") as string | undefined;
      const model = getConfig("current_stt_model") as string | undefined;

      if (
        provider === "hyprnote" &&
        model &&
        model !== "cloud" &&
        (model.startsWith("am-") || model.startsWith("Quantized"))
      ) {
        await localSttCommands.startServer(model as SupportedSttModel);
      } else {
        await localSttCommands.stopServer(null);
      }
    },
  },

  ai_language: {
    key: "ai_language",
    default: "en",
  },

  spoken_languages: {
    key: "spoken_languages",
    default: ["en"] as string[],
  },

  save_recordings: {
    key: "save_recordings",
    default: true,
  },

  telemetry_consent: {
    key: "telemetry_consent",
    default: true,
  },

  current_llm_provider: {
    key: "current_llm_provider",
    default: undefined,
  },

  current_llm_model: {
    key: "current_llm_model",
    default: undefined,
  },

  vibrancy_enabled: {
    key: "vibrancy_enabled",
    default: false,
    sideEffect: async (_value: boolean, getConfig) => {
      const enabled = getConfig("vibrancy_enabled") as boolean;
      const material = getConfig("vibrancy_material") as string;
      const radius = getConfig("vibrancy_radius") as number;

      if (enabled) {
        await invoke("plugin:windows|apply_vibrancy", {
          window: { type: "main" },
          material,
          radius: radius > 0 ? radius : null,
        });
      } else {
        await invoke("plugin:windows|clear_vibrancy", {
          window: { type: "main" },
        });
      }
    },
  },

  vibrancy_material: {
    key: "vibrancy_material",
    default: "Sidebar",
    sideEffect: async (_value: string, getConfig) => {
      const enabled = getConfig("vibrancy_enabled") as boolean;
      if (!enabled) return;

      const material = getConfig("vibrancy_material") as string;
      const radius = getConfig("vibrancy_radius") as number;

      await invoke("plugin:windows|apply_vibrancy", {
        window: { type: "main" },
        material,
        radius: radius > 0 ? radius : null,
      });
    },
  },

  vibrancy_radius: {
    key: "vibrancy_radius",
    default: 0,
    sideEffect: async (_value: number, getConfig) => {
      const enabled = getConfig("vibrancy_enabled") as boolean;
      if (!enabled) return;

      const material = getConfig("vibrancy_material") as string;
      const radius = getConfig("vibrancy_radius") as number;

      await invoke("plugin:windows|apply_vibrancy", {
        window: { type: "main" },
        material,
        radius: radius > 0 ? radius : null,
      });
    },
  },
} satisfies Record<ConfigKey, ConfigDefinition>;
