import { disable, enable } from "@tauri-apps/plugin-autostart";

import { commands as detectCommands } from "@hypr/plugin-detect";
import { commands as localSttCommands, type SupportedSttModel } from "@hypr/plugin-local-stt";

export type ConfigKey =
  | "autostart"
  | "notification_detect"
  | "notification_event"
  | "respect_dnd"
  | "ignored_platforms"
  | "quit_intercept"
  | "current_stt_provider"
  | "current_stt_model"
  | "ai_language"
  | "spoken_languages"
  | "save_recordings"
  | "telemetry_consent"
  | "current_llm_provider"
  | "current_llm_model";

interface ConfigDefinition<T = any> {
  key: ConfigKey;
  default: T;
  sideEffect?: (value: T, getConfig: <K extends ConfigKey>(key: K) => any) => void | Promise<void>;
}

export const CONFIG_REGISTRY = {
  autostart: {
    key: "autostart",
    default: false,
    sideEffect: async (value: boolean) => {
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
    sideEffect: async (value: boolean) => {
      await detectCommands.setRespectDoNotDisturb(value);
    },
  },

  ignored_platforms: {
    key: "ignored_platforms",
    default: [] as string[],
    sideEffect: async (value: string[]) => {
      await detectCommands.setIgnoredBundleIds(value);
    },
  },

  quit_intercept: {
    key: "quit_intercept",
    default: false,
    sideEffect: async (value: boolean) => {
      if (value) {
        await detectCommands.setQuitHandler();
      } else {
        await detectCommands.resetQuitHandler();
      }
    },
  },

  current_stt_provider: {
    key: "current_stt_provider",
    default: undefined,
    sideEffect: async (_value: string | undefined, getConfig) => {
      const provider = getConfig("current_stt_provider");
      const model = getConfig("current_stt_model") as SupportedSttModel | undefined;

      if (provider !== "hyprnote") {
        await localSttCommands.stopServer("external");
        return;
      }

      if (model?.startsWith("am-")) {
        await localSttCommands.stopServer("external");
        await new Promise((resolve) => setTimeout(resolve, 500));
        await localSttCommands.startServer(model);
      }

      if (model?.startsWith("Quantized")) {
        await localSttCommands.stopServer("internal");
        await new Promise((resolve) => setTimeout(resolve, 500));
        await localSttCommands.startServer(model);
      }
    },
  },

  current_stt_model: {
    key: "current_stt_model",
    default: undefined,
    sideEffect: async (_value: string | undefined, getConfig) => {
      const provider = getConfig("current_stt_provider");
      const model = getConfig("current_stt_model") as SupportedSttModel | undefined;

      if (provider !== "hyprnote") {
        await localSttCommands.stopServer("external");
        return;
      }

      if (model?.startsWith("am-")) {
        await localSttCommands.stopServer("external");
        await new Promise((resolve) => setTimeout(resolve, 500));
        await localSttCommands.startServer(model);
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
} satisfies Record<ConfigKey, ConfigDefinition>;
