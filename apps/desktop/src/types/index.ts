export * from "./server.gen";
export * from "./tauri.gen";

import type { RegisteredRouter, RouteIds } from "@tanstack/react-router";
import type { NangoIntegration } from "./server.gen";

export type RoutePath = RouteIds<RegisteredRouter["routeTree"]>;

export type CalendarIntegration =
  | Exclude<NangoIntegration, "outlook-calendar">
  | "apple-calendar";

export interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
}
