import type { QueryClient } from "@tanstack/react-query";
import type { RegisteredRouter, RouteIds } from "@tanstack/react-router";

export * from "./server.gen";
export * from "./tauri.gen";

import type { OngoingSessionStore, SessionsStore } from "@hypr/utils/stores";
import type { NangoIntegration } from "./server.gen";

export type Context = {
  userId?: string;
  ongoingSessionStore: OngoingSessionStore;
  sessionsStore: SessionsStore;
  queryClient: QueryClient;
};

export type RoutePath = RouteIds<RegisteredRouter["routeTree"]>;

export type CalendarIntegration =
  | NangoIntegration
  | "apple-calendar";

export interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
}
