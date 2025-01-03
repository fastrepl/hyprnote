import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";

import { AuthContext, AuthProvider, useAuth } from "./auth";

import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { messages as enMessages } from "./locales/en/messages";
import { messages as koMessages } from "./locales/ko/messages";

i18n.load({
  en: enMessages,
  ko: koMessages,
});
i18n.activate("ko");

import "./styles/global.css";
import "@hypr/magic/styles.css";
import "@hypr/shadcn/styles.css";

import { useTauriStore } from "./stores/tauri";

export type Context = {
  auth?: AuthContext;
  queryClient: QueryClient;
};

const queryClient = new QueryClient();
const router = createRouter({
  routeTree,
  context: {
    auth: undefined,
    queryClient,
  },
  defaultPreload: "intent",
  // Since we're using React Query, we don't want loader calls to ever be stale
  // This will ensure that the loader is always called when the route is preloaded or visited
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <I18nProvider i18n={i18n}>
          <App />
        </I18nProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}
