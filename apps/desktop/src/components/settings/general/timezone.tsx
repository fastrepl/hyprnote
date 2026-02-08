import { useMemo } from "react";

import { useConfigValue } from "../../../config/use-config";
import * as settings from "../../../store/tinybase/store/settings";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "./searchable-select";

const COMMON_TIMEZONES = [
  { value: "Pacific/Honolulu", label: "Hawaii (UTC-10)" },
  { value: "America/Anchorage", label: "Alaska (UTC-9)" },
  { value: "America/Los_Angeles", label: "Pacific Time (UTC-8)" },
  { value: "America/Denver", label: "Mountain Time (UTC-7)" },
  { value: "America/Chicago", label: "Central Time (UTC-6)" },
  { value: "America/New_York", label: "Eastern Time (UTC-5)" },
  { value: "America/Sao_Paulo", label: "Sao Paulo (UTC-3)" },
  { value: "Atlantic/Reykjavik", label: "Reykjavik (UTC+0)" },
  { value: "Europe/London", label: "London (UTC+0/+1)" },
  { value: "Europe/Paris", label: "Paris (UTC+1/+2)" },
  { value: "Europe/Berlin", label: "Berlin (UTC+1/+2)" },
  { value: "Africa/Cairo", label: "Cairo (UTC+2)" },
  { value: "Europe/Moscow", label: "Moscow (UTC+3)" },
  { value: "Asia/Dubai", label: "Dubai (UTC+4)" },
  { value: "Asia/Kolkata", label: "India (UTC+5:30)" },
  { value: "Asia/Bangkok", label: "Bangkok (UTC+7)" },
  { value: "Asia/Singapore", label: "Singapore (UTC+8)" },
  { value: "Asia/Shanghai", label: "China (UTC+8)" },
  { value: "Asia/Tokyo", label: "Tokyo (UTC+9)" },
  { value: "Asia/Seoul", label: "Seoul (UTC+9)" },
  { value: "Australia/Sydney", label: "Sydney (UTC+10/+11)" },
  { value: "Pacific/Auckland", label: "Auckland (UTC+12/+13)" },
];

export function TimezoneSelector() {
  const value = useConfigValue("timezone");
  const setTimezone = settings.UI.useSetValueCallback(
    "timezone",
    (val: string) => val,
    [],
    settings.STORE_ID,
  );

  const systemTimezone = useMemo(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  const options: SearchableSelectOption[] = useMemo(
    () => [
      { value: "system", label: `System (${systemTimezone})` },
      ...COMMON_TIMEZONES,
    ],
    [systemTimezone],
  );

  const displayValue = value || "system";

  const handleChange = (val: string) => {
    setTimezone(val === "system" ? "" : val);
  };

  return (
    <div className="flex flex-row items-center justify-between">
      <div>
        <h3 className="text-sm font-medium mb-1">Timezone</h3>
        <p className="text-xs text-muted-foreground">
          Override the timezone used for the sidebar timeline
        </p>
      </div>
      <SearchableSelect
        value={displayValue}
        onChange={handleChange}
        options={options}
        placeholder="Select timezone"
        searchPlaceholder="Search timezone..."
        className="w-56"
      />
    </div>
  );
}
