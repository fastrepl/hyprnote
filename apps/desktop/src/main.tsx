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
import { WindowProvider, HyprProvider } from "./contexts";
import { useTauriStore } from "./stores/tauri";
import { AuthContext, AuthProvider, useAuth } from "./auth";

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
import "@hypr/tiptap/renderer/style.css";

export type Context = {
  auth?: AuthContext;
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
    auth: undefined,
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
  const load = useTauriStore((state) => state.load);
  load().then(() => {});

  const auth = useAuth();

  const coutext: Required<Context> = {
    auth,
    queryClient,
  };

  return <RouterProvider router={router} context={coutext} />;
}

const rootElement = document.getElementById("root")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <CatchBoundary getResetKey={() => "error"} errorComponent={ErrorComponent}>
      <HyprProvider>
        <TooltipProvider delayDuration={700} skipDelayDuration={300}>
          <ThemeProvider defaultTheme="light">
            <WindowProvider>
              <QueryClientProvider client={queryClient}>
                <AuthProvider>
                  <I18nProvider i18n={i18n}>
                    <App />
                  </I18nProvider>
                </AuthProvider>
              </QueryClientProvider>
            </WindowProvider>
          </ThemeProvider>
        </TooltipProvider>
      </HyprProvider>
    </CatchBoundary>,
  );
}
