import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";

import "./styles/globals.css";
import "@hypr/ui/globals.css";

import * as Sentry from "@sentry/react";
import { ThemeProvider } from "@hypr/ui/contexts/theme";
import { ClerkProvider } from "@clerk/clerk-react";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
  throw new Error("'VITE_CLERK_PUBLISHABLE_KEY' is not set");
}

if (!import.meta.env.VITE_SENTRY_DSN) {
  throw new Error("'VITE_SENTRY_DSN' is not set");
}

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
  tracesSampleRate: 1.0,
});

const queryClient = new QueryClient();

const enableMocking = async () => {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const { worker } = await import("./mocks/browser");
  return worker.start();
};

enableMocking().then(() => {
  const rootElement = document.getElementById("app")!;

  if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement);

    root.render(
      <ThemeProvider defaultTheme="light">
        <QueryClientProvider client={queryClient}>
          <ClerkProvider
            publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
          >
            <RouterProvider router={router} />
          </ClerkProvider>
        </QueryClientProvider>
      </ThemeProvider>,
    );
  }
});
