import { useConfigValue } from "../config/use-config";

export function getSystemTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function useTimezone(): string {
  const configuredTimezone = useConfigValue("timezone");
  return configuredTimezone ?? getSystemTimezone();
}

export function formatTimeWithTimezone(
  date: Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "numeric",
    timeZone: timezone,
  };
  return date.toLocaleTimeString([], { ...defaultOptions, ...options });
}

export function formatDateWithTimezone(
  date: Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
  };
  return date.toLocaleDateString([], { ...defaultOptions, ...options });
}

export function formatDateTimeWithTimezone(
  date: Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
  };
  return date.toLocaleString([], { ...defaultOptions, ...options });
}
