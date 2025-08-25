import "@hypr/ui/globals.css";
import "./styles/globals.css";

import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { CatchBoundary, createRouter, ErrorComponent, RouterProvider } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import ReactDOM from "react-dom/client";

import { recordingStartFailedToast } from "@/components/toast/shared";
import type { Context } from "@/types";
import { commands } from "@/types";
import { commands as authCommands } from "@hypr/plugin-auth";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Toaster } from "@hypr/ui/components/ui/toast";
import { TooltipProvider } from "@hypr/ui/components/ui/tooltip";
import { ThemeProvider } from "@hypr/ui/contexts/theme";
import { createOngoingSessionStore, createSessionsStore } from "@hypr/utils/stores";
import { broadcastQueryClient } from "./utils";

import { messages as enMessages } from "./locales/en/messages";
import { messages as koMessages } from "./locales/ko/messages";

import { routeTree } from "./routeTree.gen";

import * as Sentry from "@sentry/react";
import { defaultOptions } from "tauri-plugin-sentry-api";

i18n.load({
  en: enMessages,
  ko: koMessages,
});

// Language initialization component
function LanguageInitializer({ children }: { children: ReactNode }) {
  const config = useQuery({
    queryKey: ["config", "general"],
    queryFn: async () => {
      const result = await dbCommands.getConfig();
      return result;
    },
    retry: 1,
  });

  useEffect(() => {
    const displayLanguage = config.data?.general.display_language;
    if (displayLanguage && (displayLanguage === "en" || displayLanguage === "ko")) {
      i18n.activate(displayLanguage);
    } else {
      // Fallback to English for new users, invalid languages, or if config fails to load
      i18n.activate("en");
    }
  }, [config.data, config.error]);

  // Don't render children until language is initialized
  if (config.isLoading) {
    return null;
  }

  return <>{children}</>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // for most case, we don't want cache
      gcTime: 0,
    },
  },
});

const sessionsStore = createSessionsStore();
const ongoingSessionStore = createOngoingSessionStore(sessionsStore, {
  onRecordingStartFailed: (error) => {
    recordingStartFailedToast();
  },
});

const context: Context = {
  queryClient,
  ongoingSessionStore,
  sessionsStore,
};

const router = createRouter({
  routeTree,
  context: context as Required<Context>,
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

commands.sentryDsn().then((dsn) => {
  dbCommands.getConfig().then((config) => {
    if (config.general.telemetry_consent) {
      Sentry.init({
        ...defaultOptions,
        dsn,
        // https://docs.sentry.io/platforms/javascript/guides/react/features/tanstack-router/
        integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
        tracesSampleRate: 1.0,
      });
    }
  });
});

const rootElement = document.getElementById("root")!;

function App() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return broadcastQueryClient(queryClient);
  }, [queryClient]);

  const [userId, onboardingSessionId, thankYouSessionId] = useQueries({
    queries: [
      {
        queryKey: ["auth-user-id"],
        queryFn: () => authCommands.getFromStore("auth-user-id"),
      },
      {
        queryKey: ["session", "onboarding", "id"],
        queryFn: () => dbCommands.onboardingSessionId(),
      },
      {
        queryKey: ["session", "thank-you", "id"],
        queryFn: () => dbCommands.thankYouSessionId(),
      },
    ],
  });

  if (!userId.data || !onboardingSessionId.data || !thankYouSessionId.data) {
    return null;
  }

  return (
    <RouterProvider
      router={router}
      context={{
        ...context,
        userId: userId.data,
        onboardingSessionId: onboardingSessionId.data,
        thankYouSessionId: thankYouSessionId.data,
      }}
    />
  );
}

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <CatchBoundary getResetKey={() => "error"} errorComponent={ErrorComponent}>
      <TooltipProvider delayDuration={700} skipDelayDuration={300}>
        <ThemeProvider defaultTheme="light">
          <QueryClientProvider client={queryClient}>
            <LanguageInitializer>
              <I18nProvider i18n={i18n}>
                <App />
                <Toaster
                  position="bottom-left"
                  expand={true}
                  offset={16}
                  duration={Infinity}
                  swipeDirections={[]}
                />
              </I18nProvider>
            </LanguageInitializer>
          </QueryClientProvider>
        </ThemeProvider>
      </TooltipProvider>
    </CatchBoundary>,
  );
}
