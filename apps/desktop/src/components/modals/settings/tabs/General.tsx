import { useState } from "react";
import { useTranslation } from "react-i18next";

import * as Switch from "@radix-ui/react-switch";
import * as Select from "@radix-ui/react-select";
import { RiArrowDownSLine, RiCheckLine } from "@remixicon/react";

export function General() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    autoStart: true,
    autoUpdate: true,
    sendCrashReports: true,
    sendUsageData: false,
  });

  const languages = [
    { value: "ko", label: "한국어" },
    { value: "en", label: "English" },
    { value: "ja", label: "日本語" },
    { value: "zh-CN", label: "简体中文" },
    { value: "zh-TW", label: "繁體中文" },
    { value: "es", label: "Español" },
    { value: "hi", label: "हिंदी" },
    { value: "ta", label: "தமிழ்" },
    { value: "pt-BR", label: "Português (Brasil)" },
    { value: "pt-PT", label: "Português (Portugal)" },
    { value: "fr-FR", label: "Français (France)" },
    { value: "fr-CA", label: "Français (Canada)" },
    { value: "it", label: "Italiano" },
    { value: "de", label: "Deutsch" },
    { value: "nl", label: "Nederlands" },
    { value: "pl", label: "Polski" },
    { value: "sv", label: "Svenska" },
    { value: "no", label: "Norsk" },
  ];

  const themes = [
    { value: "light", label: t("settings.general.themes.light") },
    { value: "dark", label: t("settings.general.themes.dark") },
    { value: "system", label: t("settings.general.themes.system") },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          {t("settings.tabs.general")}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {t("settings.general.description")}
        </p>
      </div>

      <div className="h-px bg-gray-200" />

      <div className="space-y-4">
        {/* Language Selection */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              {t("settings.general.language")}
            </h4>
            <p className="text-sm text-gray-500">
              {t("settings.general.languageDescription")}
            </p>
          </div>
          <Select.Root value={"ko"} onValueChange={() => {}}>
            <Select.Trigger className="inline-flex h-9 items-center justify-between gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 focus:outline-none">
              <Select.Value />
              <Select.Icon>
                <RiArrowDownSLine className="h-4 w-4 text-gray-500" />
              </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
              <Select.Content className="max-h-[200px] overflow-hidden rounded-md border border-gray-200 bg-white shadow-md">
                <Select.Viewport className="overflow-y-auto p-1">
                  {languages.map((lang) => (
                    <Select.Item
                      key={lang.value}
                      value={lang.value}
                      className="relative flex h-8 select-none items-center rounded-sm px-6 py-1 text-sm text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:outline-none"
                    >
                      <Select.ItemText>{lang.label}</Select.ItemText>
                      <Select.ItemIndicator className="absolute left-1 inline-flex items-center">
                        <RiCheckLine className="h-4 w-4" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        {/* Theme Selection */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              {t("settings.general.theme")}
            </h4>
            <p className="text-sm text-gray-500">
              {t("settings.general.themeDescription")}
            </p>
          </div>
          <Select.Root value={"light"} onValueChange={() => {}}>
            <Select.Trigger className="inline-flex h-9 items-center justify-between gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 focus:outline-none">
              <Select.Value />
              <Select.Icon>
                <RiArrowDownSLine className="h-4 w-4 text-gray-500" />
              </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
              <Select.Content className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-md">
                <Select.Viewport className="p-1">
                  {themes.map((themeOption) => (
                    <Select.Item
                      key={themeOption.value}
                      value={themeOption.value}
                      className="relative flex h-8 select-none items-center rounded-sm px-6 py-1 text-sm text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:outline-none"
                    >
                      <Select.ItemText>{themeOption.label}</Select.ItemText>
                      <Select.ItemIndicator className="absolute left-1 inline-flex items-center">
                        <RiCheckLine className="h-4 w-4" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              {t("settings.general.autoStart")}
            </h4>
            <p className="text-sm text-gray-500">
              {t("settings.general.autoStartDescription")}
            </p>
          </div>
          <Switch.Root
            checked={settings.autoStart}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, autoStart: checked }))
            }
            className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-600"
          >
            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              {t("settings.general.autoUpdate")}
            </h4>
            <p className="text-sm text-gray-500">
              {t("settings.general.autoUpdateDescription")}
            </p>
          </div>
          <Switch.Root
            checked={settings.autoUpdate}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, autoUpdate: checked }))
            }
            className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-600"
          >
            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              {t("settings.general.crashReports")}
            </h4>
            <p className="text-sm text-gray-500">
              {t("settings.general.crashReportsDescription")}
            </p>
          </div>
          <Switch.Root
            checked={settings.sendCrashReports}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, sendCrashReports: checked }))
            }
            className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-600"
          >
            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              {t("settings.general.usageData")}
            </h4>
            <p className="text-sm text-gray-500">
              {t("settings.general.usageDataDescription")}
            </p>
          </div>
          <Switch.Root
            checked={settings.sendUsageData}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, sendUsageData: checked }))
            }
            className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-600"
          >
            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
        </div>
      </div>
    </div>
  );
}
