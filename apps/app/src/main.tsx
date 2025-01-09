import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";

import "./styles/globals.css";
import "@hypr/ui/globals.css";

import * as Sentry from "@sentry/react";
import { ThemeProvider } from "@hypr/ui/contexts/theme";
import { ClerkProvider } from "@clerk/clerk-react";

if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY is not set");
}

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

Sentry.init({
  dsn: "https://a4abe058104d9e2142abe78f702e3de9@o4506190168522752.ingest.us.sentry.io/4508570874937344",
  integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
  tracesSampleRate: 1.0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

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
