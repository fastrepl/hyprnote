import "@hypr/ui/globals.css";
import "./styles/globals.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { Provider as TinyBaseProvider, useStores } from "tinybase/ui-react";
import { createManager } from "tinytick";
import { Provider as TinyTickProvider, useCreateManager } from "tinytick/ui-react";

import { TaskManager } from "./components/task-manager";
import { type Store as InternalStore, STORE_ID as STORE_ID_INTERNAL } from "./store/tinybase/internal";
import {
  type Store as PersistedStore,
  STORE_ID as STORE_ID_PERSISTED,
  StoreComponent as StoreComponentPersisted,
} from "./store/tinybase/persisted";

import { routeTree } from "./routeTree.gen";
import { createAITaskStore } from "./store/zustand/ai-task";
import { createListenerStore } from "./store/zustand/listener";

const listenerStore = createListenerStore();
const aiTaskStore = createAITaskStore();
const queryClient = new QueryClient();

const router = createRouter({ routeTree, context: undefined });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const stores = useStores();

  const persistedStore = stores[STORE_ID_PERSISTED] as unknown as PersistedStore;
  const internalStore = stores[STORE_ID_INTERNAL] as unknown as InternalStore;

  if (!persistedStore || !internalStore) {
    return null;
  }

  return (
    <RouterProvider
      router={router}
      context={{
        persistedStore,
        internalStore,
        listenerStore,
        aiTaskStore,
      }}
    />
  );
}

function AppWithTiny() {
  const manager = useCreateManager(() => {
    return createManager().start();
  });

  return (
    <QueryClientProvider client={queryClient}>
      <TinyTickProvider manager={manager}>
        <TinyBaseProvider>
          <App />
          <StoreComponentPersisted />
          <TaskManager />
        </TinyBaseProvider>
      </TinyTickProvider>
    </QueryClientProvider>
  );
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
