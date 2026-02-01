import { OutlitProvider } from "@outlit/browser/react";
import * as Sentry from "@sentry/tanstackstart-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { BrandingProvider } from "./contexts/BrandingProvider";
import { env } from "./env";
import { getCurrentHostname } from "./lib/feature-flags";
import { PostHogProvider } from "./providers/posthog";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    scrollRestoration: true,
    trailingSlash: "always",
    Wrap: (props: { children: React.ReactNode }) => {
      const hostname = getCurrentHostname();
      return (
        <BrandingProvider hostname={hostname}>
          <PostHogProvider>
            <OutlitProvider
              publicKey={env.VITE_OUTLIT_PUBLIC_KEY}
              trackPageviews
            >
              <QueryClientProvider client={queryClient}>
                {props.children}
              </QueryClientProvider>
            </OutlitProvider>
          </PostHogProvider>
        </BrandingProvider>
      );
    },
  });

  if (!router.isServer && env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: env.VITE_SENTRY_DSN,
      release: env.VITE_APP_VERSION
        ? `hyprnote-web@${env.VITE_APP_VERSION}`
        : undefined,
      sendDefaultPii: true,
      integrations: [
        Sentry.tanstackRouterBrowserTracingIntegration(router),
        Sentry.replayIntegration(),
      ],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  }

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}
