import { useState } from "react";
import * as Switch from "@radix-ui/react-switch";
import { useTranslation } from "react-i18next";

export function Calendars() {
  const { t } = useTranslation();
  const [googleCalendar, setGoogleCalendar] = useState(false);
  const [iCalCalendar, setICalCalendar] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900">{t("settings.calendar.title")}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {t("settings.calendar.description")}
        </p>
      </div>

      <div className="h-px bg-gray-200" />

      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("settings.calendar.google.title")}
          </label>
          <p className="text-sm text-gray-500">
            {t("settings.calendar.google.description")}
          </p>
        </div>
        <Switch.Root
          checked={googleCalendar}
          onCheckedChange={setGoogleCalendar}
          className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-500"
        >
          <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
        </Switch.Root>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("settings.calendar.ical.title")}
          </label>
          <p className="text-sm text-gray-500">
            {t("settings.calendar.ical.description")}
          </p>
        </div>
        <Switch.Root
          checked={iCalCalendar}
          onCheckedChange={setICalCalendar}
          className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-500"
        >
          <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
        </Switch.Root>
      </div>
    </div>
  );
}
