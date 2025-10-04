import "@hypr/ui/globals.css";
import "./styles/globals.css";

import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { Provider, useStores } from "tinybase/ui-react";

import { V1 } from "./tinybase/seed";
import { type Store as InternalStore, STORE_ID as STORE_ID_INTERNAL } from "./tinybase/store/internal";
import {
  type Store as MemoryStore,
  STORE_ID as STORE_ID_MEMORY,
  StoreComponent as StoreComponentMemory,
} from "./tinybase/store/memory";
import {
  METRICS,
  type Store as PersistedStore,
  STORE_ID as STORE_ID_PERSISTED,
  StoreComponent as StoreComponentPersisted,
  UI,
} from "./tinybase/store/persisted";

import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree, context: {} });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const stores = useStores();

  const persistedStore = stores[STORE_ID_PERSISTED] as unknown as PersistedStore;
  const memoryStore = stores[STORE_ID_MEMORY] as unknown as MemoryStore;
  const internalStore = stores[STORE_ID_INTERNAL] as unknown as InternalStore;

  const humansCount = UI.useMetric(METRICS.totalHumans, STORE_ID_PERSISTED);

  if (!persistedStore || !memoryStore || !internalStore) {
    return null;
  }

  if (import.meta.env.DEV) {
    // @ts-ignore
    window.__dev = {
      seed: () => persistedStore.setTables(V1),
    };

    if (!humansCount) {
      persistedStore.setTables(V1);
    }
  }

  return <RouterProvider router={router} context={{ persistedStore, memoryStore, internalStore }} />;
}

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <Provider>
        <App />
        <StoreComponentPersisted />
        <StoreComponentMemory />
      </Provider>
    </StrictMode>,
  );
}
