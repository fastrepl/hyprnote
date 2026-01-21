import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { disable, enable } from "@tauri-apps/plugin-autostart";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as listenerCommands } from "@hypr/plugin-listener";
import type { General, GeneralStorage } from "@hypr/store";

import { useConfigValues } from "../../../config/use-config";
import * as settings from "../../../store/tinybase/store/settings";
import { AccountSettings } from "./account";
import { AppSettingsView } from "./app-settings";
import { Audio } from "./audio";
import { MainLanguageView } from "./main-language";
import { NotificationSettingsView } from "./notification";
import { Permissions } from "./permissions";
import { SpokenLanguagesView } from "./spoken-languages";

type SettingsSection =
  | "app"
  | "language"
  | "notifications"
  | "permissions"
  | "audio"
  | "data"
  | "lab";

export function SettingsGeneral({
  appRef,
  languageRef,
  notificationsRef,
  permissionsRef,
  audioRef,
}: {
  appRef?: React.Ref<HTMLDivElement>;
  languageRef?: React.Ref<HTMLDivElement>;
  notificationsRef?: React.Ref<HTMLDivElement>;
  permissionsRef?: React.Ref<HTMLDivElement>;
  audioRef?: React.Ref<HTMLDivElement>;
  activeSection?: SettingsSection;
} = {}) {
  const value = useConfigValues([
    "autostart",
    "notification_detect",
    "save_recordings",
    "telemetry_consent",
    "ai_language",
    "spoken_languages",
    "current_stt_provider",
  ] as const);

  const supportedLanguagesQuery = useQuery({
    queryKey: ["documented-language-codes", "live"],
    queryFn: async () => {
      const result = await listenerCommands.listDocumentedLanguageCodesLive();
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: Infinity,
  });
  const supportedLanguages = supportedLanguagesQuery.data ?? ["en"];

  const suggestedProviders = useQuery({
    enabled: !!value.spoken_languages?.length,
    queryKey: ["suggested-stt-providers", value.spoken_languages],
    queryFn: async () => {
      const result = await listenerCommands.suggestProvidersForLanguagesLive(
        value.spoken_languages ?? [],
      );

      if (result.status === "error") {
        throw new Error(result.error);
      }

      return result.data.filter(
        (provider) => !["fireworks", "openai"].includes(provider),
      );
    },
  });

  const setPartialValues = settings.UI.useSetPartialValuesCallback(
    (row: Partial<General>) =>
      ({
        ...row,
        spoken_languages: row.spoken_languages
          ? JSON.stringify(row.spoken_languages)
          : undefined,
        ignored_platforms: row.ignored_platforms
          ? JSON.stringify(row.ignored_platforms)
          : undefined,
        ignored_recurring_series: row.ignored_recurring_series
          ? JSON.stringify(row.ignored_recurring_series)
          : undefined,
      }) satisfies Partial<GeneralStorage>,
    [],
    settings.STORE_ID,
  );

  const form = useForm({
    defaultValues: {
      autostart: value.autostart,
      notification_detect: value.notification_detect,
      save_recordings: value.save_recordings,
      telemetry_consent: value.telemetry_consent,
      ai_language: value.ai_language,
      spoken_languages: value.spoken_languages,
    },
    listeners: {
      onChange: ({ formApi }) => {
        const {
          form: { errors },
        } = formApi.getAllErrors();
        if (errors.length > 0) {
          console.log(errors);
        }
        void formApi.handleSubmit();
      },
    },
    onSubmit: ({ value }) => {
      setPartialValues(value);

      if (value.autostart) {
        void enable();
      } else {
        void disable();
      }

      void analyticsCommands.event({
        event: "settings_changed",
        autostart: value.autostart,
        notification_detect: value.notification_detect,
        save_recordings: value.save_recordings,
        telemetry_consent: value.telemetry_consent,
      });
      void analyticsCommands.setProperties({
        set: {
          telemetry_opt_out: value.telemetry_consent === false,
        },
      });
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="pt-3">
        <AccountSettings />
      </div>

      <div ref={appRef}>
        <form.Field name="autostart">
          {(autostartField) => (
            <form.Field name="notification_detect">
              {(notificationDetectField) => (
                <form.Field name="save_recordings">
                  {(saveRecordingsField) => (
                    <form.Field name="telemetry_consent">
                      {(telemetryConsentField) => (
                        <AppSettingsView
                          autostart={{
                            title: "Start Hyprnote automatically at login",
                            description:
                              "Hyprnote will always be ready for action without you having to turn it on",
                            value: autostartField.state.value,
                            onChange: (val) => autostartField.handleChange(val),
                          }}
                          notificationDetect={{
                            title:
                              "Start/Stop listening to meetings automatically",
                            description:
                              "You don't have to press button every time — we'll start/stop listening for you",
                            value: notificationDetectField.state.value,
                            onChange: (val) =>
                              notificationDetectField.handleChange(val),
                          }}
                          saveRecordings={{
                            title: "Save recordings",
                            description:
                              "Audio files of meetings will be saved locally and won't be leaving your device",
                            value: saveRecordingsField.state.value,
                            onChange: (val) =>
                              saveRecordingsField.handleChange(val),
                          }}
                          telemetryConsent={{
                            title: "Share usage data",
                            description:
                              "Help us improve Hyprnote by sharing anonymous metadata like button clicks",
                            value: telemetryConsentField.state.value,
                            onChange: (val) =>
                              telemetryConsentField.handleChange(val),
                          }}
                        />
                      )}
                    </form.Field>
                  )}
                </form.Field>
              )}
            </form.Field>
          )}
        </form.Field>
      </div>

      <div ref={languageRef}>
        <h2 className="font-semibold font-serif mb-4">Language & Vocabulary</h2>
        <div className="flex flex-col gap-6">
          <form.Field name="ai_language">
            {(field) => (
              <MainLanguageView
                value={field.state.value}
                onChange={(val) => field.handleChange(val)}
                supportedLanguages={supportedLanguages}
              />
            )}
          </form.Field>
          <form.Field name="spoken_languages">
            {(field) => (
              <>
                <SpokenLanguagesView
                  value={field.state.value}
                  onChange={(val) => field.handleChange(val)}
                  supportedLanguages={supportedLanguages}
                />
                <span className="text-xs text-neutral-500">
                  Providers outside {suggestedProviders.data?.join(", ")} may
                  not work properly.
                </span>
              </>
            )}
          </form.Field>
        </div>
      </div>

      <div ref={notificationsRef}>
        <h2 className="font-semibold font-serif mb-4">Notifications</h2>
        <NotificationSettingsView />
      </div>

      <div ref={permissionsRef}>
        <Permissions />
      </div>

      <div ref={audioRef}>
        <Audio />
      </div>
    </div>
  );
}
