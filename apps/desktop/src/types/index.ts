import type { NangoIntegration } from "./server";

export type CalendarIntegration =
  | Exclude<NangoIntegration, "outlook-calendar">
  | "apple-calendar";
