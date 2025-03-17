import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CatchBoundary, createRouter, ErrorComponent, RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import type { Context } from "@/types";
import { Toaster } from "@hypr/ui/components/ui/sonner";
import { TooltipProvider } from "@hypr/ui/components/ui/tooltip";
import { ThemeProvider } from "@hypr/ui/contexts/theme";
import UpdateToastNotification from "./components/update-toast";

import { messages as enMessages } from "./locales/en/messages";
import { messages as koMessages } from "./locales/ko/messages";

import { routeTree } from "./routeTree.gen";
import { createSessionsStore } from "./stores";

import * as Sentry from "@sentry/react";
import { defaultOptions } from "tauri-plugin-sentry-api";

i18n.load({
  en: enMessages,
  ko: koMessages,
});

// TODO: load language from user settings
i18n.activate("ko");

import "@hypr/ui/globals.css";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // for most case, we don't want cache
      gcTime: 0,
    },
  },
});

const context: Context = {
  queryClient,
  sessionsStore: createSessionsStore(),
};

const router = createRouter({
  routeTree,
  context,
  defaultPreload: "intent",
  defaultViewTransition: false,
  // Since we're using React Query, we don't want loader calls to ever be stale
  // This will ensure that the loader is always called when the route is preloaded or visited
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// https://docs.sentry.io/platforms/javascript/guides/react/features/tanstack-router/
Sentry.init({
  ...defaultOptions,
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
  tracesSampleRate: 1.0,
});

function App() {
  return (
    <>
      <RouterProvider router={router} context={context} />
      <UpdateToastNotification />
    </>
  );
}

const rootElement = document.getElementById("root")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <CatchBoundary getResetKey={() => "error"} errorComponent={ErrorComponent}>
      <TooltipProvider delayDuration={700} skipDelayDuration={300}>
        <ThemeProvider defaultTheme="light">
          <QueryClientProvider client={queryClient}>
            <I18nProvider i18n={i18n}>
              <App />
              <Toaster position="bottom-left" />
            </I18nProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </TooltipProvider>
    </CatchBoundary>,
  );
}
