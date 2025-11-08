import { LANGUAGES_ISO_639_1 } from "@huggingface/languages";
import { useForm } from "@tanstack/react-form";
import { disable, enable } from "@tauri-apps/plugin-autostart";

import { useConfigValues } from "../../../config/use-config";
import * as main from "../../../store/tinybase/main";
import { AppSettingsView } from "./app-settings";
import { MainLanguageView } from "./main-language";
import { Permissions } from "./permissions";
import { SpokenLanguagesView } from "./spoken-languages";

export function SettingsGeneral() {
  const value = useConfigValues(
    [
      "autostart",
      "notification_detect",
      "save_recordings",
      "telemetry_consent",
      "ai_language",
      "spoken_languages",
    ] as const,
  );

  const setPartialValues = main.UI.useSetPartialValuesCallback(
    (row: Partial<main.General>) => ({
      ...row,
      spoken_languages: row.spoken_languages ? JSON.stringify(row.spoken_languages) : undefined,
      ignored_platforms: row.ignored_platforms ? JSON.stringify(row.ignored_platforms) : undefined,
      dismissed_banners: row.dismissed_banners ? JSON.stringify(row.dismissed_banners) : undefined,
    } satisfies Partial<main.GeneralStorage>),
    [],
    main.STORE_ID,
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
        const { form: { errors } } = formApi.getAllErrors();
        if (errors.length > 0) {
          console.log(errors);
        }
        formApi.handleSubmit();
      },
    },
    onSubmit: ({ value }) => {
      setPartialValues(value);

      if (value.autostart) {
        enable();
      } else {
        disable();
      }
    },
  });

  return (
    <div className="flex flex-col gap-8">
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
                          description: "Hyprnote will always be ready for action without you having to turn it on",
                          value: autostartField.state.value,
                          onChange: (val) => autostartField.handleChange(val),
                        }}
                        notificationDetect={{
                          title: "Start/Stop listening to meetings automatically",
                          description: "You don't have to press button every time — we'll start/stop listening for you",
                          value: notificationDetectField.state.value,
                          onChange: (val) => notificationDetectField.handleChange(val),
                        }}
                        saveRecordings={{
                          title: "Save recordings",
                          description: "Audio files of meetings will be saved locally and won't be leaving your device",
                          value: saveRecordingsField.state.value,
                          onChange: (val) => saveRecordingsField.handleChange(val),
                        }}
                        telemetryConsent={{
                          title: "Share usage data",
                          description: "Help us improve Hyprnote by sharing anonymous metadata like button clicks",
                          value: telemetryConsentField.state.value,
                          onChange: (val) => telemetryConsentField.handleChange(val),
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

      <div>
        <h2 className="font-semibold mb-4">Language & Vocabulary</h2>
        <div className="space-y-6">
          <form.Field name="ai_language">
            {(field) => (
              <MainLanguageView
                value={field.state.value}
                onChange={(val) => field.handleChange(val)}
                supportedLanguages={SUPPORTED_LANGUAGES}
              />
            )}
          </form.Field>
          <form.Field name="spoken_languages">
            {(field) => (
              <SpokenLanguagesView
                value={field.state.value}
                onChange={(val) => field.handleChange(val)}
                supportedLanguages={SUPPORTED_LANGUAGES}
              />
            )}
          </form.Field>
        </div>
      </div>

      <Permissions />
    </div>
  );
}

type ISO_639_1_CODE = keyof typeof LANGUAGES_ISO_639_1;
const SUPPORTED_LANGUAGES: ISO_639_1_CODE[] = [
  "es",
  "it",
  "ko",
  "pt",
  "en",
  "pl",
  "ca",
  "ja",
  "de",
  "ru",
  "nl",
  "fr",
  "id",
  "uk",
  "tr",
  "ms",
  "sv",
  "zh",
  "fi",
  "no",
  "ro",
  "th",
  "vi",
  "sk",
  "ar",
  "cs",
  "hr",
  "el",
  "sr",
  "da",
  "bg",
  "hu",
  "tl",
  "bs",
  "gl",
  "mk",
  "hi",
  "et",
  "sl",
  "ta",
  "lv",
  "az",
  "he",
];
