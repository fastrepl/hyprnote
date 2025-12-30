import * as Sentry from "@sentry/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode, useMemo } from "react";
import ReactDOM from "react-dom/client";
import { Provider as TinyBaseProvider, useStores } from "tinybase/ui-react";
import { createManager } from "tinytick";
import {
  Provider as TinyTickProvider,
  useCreateManager,
} from "tinytick/ui-react";

import {
  getCurrentWebviewWindowLabel,
  init as initWindowsPlugin,
} from "@hypr/plugin-windows";
import "@hypr/ui/globals.css";

import { ChangelogListener } from "./components/changelog-listener";
import { ErrorComponent, NotFoundComponent } from "./components/control";
import { TaskManager } from "./components/task-manager";
import { createToolRegistry } from "./contexts/tool-registry/core";
import { env } from "./env";
import { initExtensionGlobals } from "./extension-globals";
import { routeTree } from "./routeTree.gen";
import { type Store, STORE_ID, StoreComponent } from "./store/tinybase/main";
import { StoreComponent as SettingsStoreComponent } from "./store/tinybase/settings";
import { createAITaskStore } from "./store/zustand/ai-task";
import { createListenerStore } from "./store/zustand/listener";
import "./styles/globals.css";

const toolRegistry = createToolRegistry();
const listenerStore = createListenerStore();
const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: undefined,
  defaultErrorComponent: ErrorComponent,
  defaultNotFoundComponent: NotFoundComponent,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppLoading() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        backgroundColor: "white",
        padding: "4px",
        gap: "4px",
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -468px 0;
          }
          100% {
            background-position: 468px 0;
          }
        }
        .shimmer {
          animation: shimmer 2s infinite linear;
          background: linear-gradient(
            to right,
            #fafafa 0%,
            #f5f5f5 20%,
            #fafafa 40%,
            #fafafa 100%
          );
          background-size: 800px 100%;
        }
        .shimmer-white {
          animation: shimmer 2s infinite linear;
          background: linear-gradient(
            to right,
            #ffffff 0%,
            #f5f5f5 20%,
            #ffffff 40%,
            #ffffff 100%
          );
          background-size: 800px 100%;
        }
      `}</style>
      {/* Left Sidebar Skeleton */}
      <div
        style={{
          width: "280px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          flexShrink: 0,
        }}
      >
        {/* Sidebar Header */}
        <div
          className="shimmer"
          style={{
            height: "36px",
            borderRadius: "12px",
          }}
        />
        {/* Sidebar Content */}
        <div
          className="shimmer"
          style={{
            flex: 1,
            borderRadius: "12px",
          }}
        />
        {/* Profile Section */}
        <div
          className="shimmer"
          style={{
            height: "48px",
            borderRadius: "12px",
          }}
        />
      </div>

      {/* Main Body Skeleton */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {/* Header with Tabs */}
        <div
          style={{
            height: "36px",
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          {/* Back/Forward buttons */}
          <div style={{ display: "flex", gap: "4px" }}>
            <div
              className="shimmer"
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
              }}
            />
            <div
              className="shimmer"
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
              }}
            />
          </div>
          {/* Tab items + Plus button */}
          <div
            style={{
              display: "flex",
              gap: "4px",
              flex: 1,
              minWidth: 0,
              alignItems: "center",
            }}
          >
            <div
              className="shimmer"
              style={{
                width: "180px",
                height: "36px",
                borderRadius: "12px",
              }}
            />
            <div
              className="shimmer"
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
              }}
            />
          </div>
          {/* Right side: Search */}
          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <div
              className="shimmer"
              style={{
                width: "180px",
                height: "36px",
                borderRadius: "12px",
              }}
            />
          </div>
        </div>

        {/* Body Content */}
        <div
          className="shimmer-white"
          style={{
            flex: 1,
            border: "1px solid #e5e5e5",
            borderRadius: "12px",
          }}
        />
      </div>
    </div>
  );
}

function App() {
  const stores = useStores();

  const store = stores[STORE_ID] as unknown as Store;

  const aiTaskStore = useMemo(() => {
    if (!store) {
      return null;
    }
    return createAITaskStore({ persistedStore: store });
  }, [store]);

  if (!store || !aiTaskStore) {
    return <AppLoading />;
  }

  return (
    <RouterProvider
      router={router}
      context={{
        persistedStore: store,
        internalStore: store,
        listenerStore,
        aiTaskStore,
        toolRegistry,
      }}
    />
  );
}

const isIframeContext =
  typeof window !== "undefined" && window.self !== window.top;

if (!isIframeContext && env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: env.VITE_SENTRY_DSN,
    release: env.VITE_APP_VERSION
      ? `hyprnote-desktop@${env.VITE_APP_VERSION}`
      : undefined,
    environment: import.meta.env.MODE,
    tracePropagationTargets: [env.VITE_API_URL],
    integrations: [Sentry.browserTracingIntegration()],
  });
}

function AppWithTiny() {
  const manager = useCreateManager(() => {
    return createManager().start();
  });

  // In iframe context, we're not the main window and shouldn't persist the store
  // (the parent window handles persistence, iframe syncs via postMessage)
  const isMainWindow = isIframeContext
    ? false
    : getCurrentWebviewWindowLabel() === "main";

  return (
    <QueryClientProvider client={queryClient}>
      <TinyTickProvider manager={manager}>
        <TinyBaseProvider>
          <App />
          <StoreComponent persist={isMainWindow} />
          <SettingsStoreComponent persist={isMainWindow} />
          {!isIframeContext && <TaskManager />}
          {!isIframeContext && <ChangelogListener />}
        </TinyBaseProvider>
      </TinyTickProvider>
    </QueryClientProvider>
  );
}

// Initialize plugins - the polyfill in index.html handles iframe context
initWindowsPlugin();

// Only initialize extension globals for iframe/extension contexts
// This defers heavy UI component loading until actually needed
if (isIframeContext) {
  void initExtensionGlobals();
}

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <AppWithTiny />
    </StrictMode>,
  );
}
