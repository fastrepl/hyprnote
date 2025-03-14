import type { Context } from "@/types";
import { Toaster } from "@hypr/ui/components/ui/sonner";
import { TooltipProvider } from "@hypr/ui/components/ui/tooltip";
import { ThemeProvider } from "@hypr/ui/contexts/theme";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CatchBoundary, createRouter, ErrorComponent, RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { messages as enMessages } from "./locales/en/messages";
import { messages as koMessages } from "./locales/ko/messages";
import { routeTree } from "./routeTree.gen";

i18n.load({
  en: enMessages,
  ko: koMessages,
});
i18n.activate("en");

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

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
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

import * as Sentry from "@sentry/react";
import { defaultOptions } from "tauri-plugin-sentry-api";

// https://docs.sentry.io/platforms/javascript/guides/react/features/tanstack-router/
Sentry.init({
  ...defaultOptions,
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
  tracesSampleRate: 1.0,
});

function App() {
  const context: Required<Context> = {
    queryClient,
  };

  return <RouterProvider router={router} context={context} />;
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
              <Toaster position="top-center" />
            </I18nProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </TooltipProvider>
    </CatchBoundary>,
  );
}
