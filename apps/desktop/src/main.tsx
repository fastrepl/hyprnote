import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";

import { AuthContext, AuthProvider, useAuth } from "./auth";
import { UIProvider } from "./contexts/UIContext";

import axios from "redaxios";

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
import DeeplinkHandler from "./deeplink";

export type Context = {
  auth?: AuthContext;
  axios?: ReturnType<typeof axios.create>;
  queryClient: QueryClient;
};

const queryClient = new QueryClient();
const router = createRouter({
  routeTree,
  context: {
    auth: undefined,
    axios: undefined,
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
  const auth = useAuth();

  const token = "TODO";
  const axiosInstance = axios.create({
    baseURL: "http://localhost:8000",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const coutext: Required<Context> = {
    auth,
    axios: axiosInstance,
    queryClient,
  };

  return <RouterProvider router={router} context={coutext} />;
}

const rootElement = document.getElementById("root")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <QueryClientProvider client={queryClient}>
      <DeeplinkHandler>
        <I18nProvider i18n={i18n}>
          <UIProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </UIProvider>
        </I18nProvider>
      </DeeplinkHandler>
    </QueryClientProvider>,
  );
}
