import ReactDOM from "react-dom/client";
import {
  CatchBoundary,
  ErrorComponent,
  RouterProvider,
  createRouter,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";

import { ThemeProvider } from "@hypr/ui/contexts/theme";
import { TooltipProvider } from "@hypr/ui/components/ui/tooltip";
import { WindowProvider } from "./contexts";
import { HyprProvider } from "./contexts/hypr";

import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { messages as enMessages } from "./locales/en/messages";
import { messages as koMessages } from "./locales/ko/messages";

i18n.load({
  en: enMessages,
  ko: koMessages,
});
i18n.activate("en");

import "./styles/globals.css";
import "@hypr/ui/globals.css";

import "@hypr/extension-live-summary/globals.css";

export type Context = {
  queryClient: QueryClient;
};

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
  defaultViewTransition: true,
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
          <WindowProvider>
            <QueryClientProvider client={queryClient}>
              <I18nProvider i18n={i18n}>
                <HyprProvider>
                  <App />
                </HyprProvider>
              </I18nProvider>
            </QueryClientProvider>
          </WindowProvider>
        </ThemeProvider>
      </TooltipProvider>
    </CatchBoundary>,
  );
}
