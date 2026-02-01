import { useMemo } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hypr/ui/components/ui/select";

const COMMON_TIMEZONES = [
  { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
  { value: "America/Anchorage", label: "Alaska (AKST)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PST)" },
  { value: "America/Denver", label: "Mountain Time (MST)" },
  { value: "America/Chicago", label: "Central Time (CST)" },
  { value: "America/New_York", label: "Eastern Time (EST)" },
  { value: "America/Sao_Paulo", label: "Brasilia (BRT)" },
  { value: "Atlantic/Reykjavik", label: "Iceland (GMT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Europe/Moscow", label: "Moscow (MSK)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Bangkok", label: "Bangkok (ICT)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Seoul", label: "Seoul (KST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST)" },
];

const SYSTEM_TIMEZONE_VALUE = "system";

function getSystemTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function TimezoneView({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  const systemTimezone = useMemo(() => getSystemTimezone(), []);

  const displayValue = value ?? SYSTEM_TIMEZONE_VALUE;

  const handleChange = (newValue: string) => {
    if (newValue === SYSTEM_TIMEZONE_VALUE) {
      onChange(undefined);
    } else {
      onChange(newValue);
    }
  };

  const systemLabel = useMemo(() => {
    const tz = COMMON_TIMEZONES.find((t) => t.value === systemTimezone);
    return tz ? `System (${tz.label})` : `System (${systemTimezone})`;
  }, [systemTimezone]);

  return (
    <div className="flex flex-row items-center justify-between">
      <div>
        <h3 className="text-sm font-medium mb-1">Timezone</h3>
        <p className="text-xs text-neutral-600">
          Timezone for displaying dates and times
        </p>
      </div>
      <Select value={displayValue} onValueChange={handleChange}>
        <SelectTrigger className="w-52 shadow-none focus:ring-0 focus:ring-offset-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[300px] overflow-auto">
          <SelectItem value={SYSTEM_TIMEZONE_VALUE}>{systemLabel}</SelectItem>
          {COMMON_TIMEZONES.map((tz) => (
            <SelectItem key={tz.value} value={tz.value}>
              {tz.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
