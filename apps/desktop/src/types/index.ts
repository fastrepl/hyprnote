import type { NangoIntegration } from "./server.gen";

export type CalendarIntegration =
  | Exclude<NangoIntegration, "outlook-calendar">
  | "apple-calendar";

export interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
}
