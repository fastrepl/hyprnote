import { useState } from "react";
import * as Switch from "@radix-ui/react-switch";
import { useTranslation } from "react-i18next";

export function Notifications() {
  const { t } = useTranslation();
  const [scheduledMeetings, setScheduledMeetings] = useState(true);
  const [autoIdentify, setAutoIdentify] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900">{t("settings.notifications.title")}</h3>
        <p className="mt-1 text-sm text-gray-500">{t("settings.notifications.description")}</p>
      </div>

      <div className="h-px bg-gray-200" />

      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("settings.notifications.scheduledMeetings.title")}
          </label>
          <p className="text-sm text-gray-500">
            {t("settings.notifications.scheduledMeetings.description")}
          </p>
        </div>
        <Switch.Root
          checked={scheduledMeetings}
          onCheckedChange={setScheduledMeetings}
          className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-500"
        >
          <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
        </Switch.Root>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("settings.notifications.autoIdentified.title")}
          </label>
          <p className="text-sm text-gray-500">
            {t("settings.notifications.autoIdentified.description")}
          </p>
        </div>
        <Switch.Root
          checked={autoIdentify}
          onCheckedChange={setAutoIdentify}
          className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-500"
        >
          <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
        </Switch.Root>
      </div>
    </div>
  );
}
