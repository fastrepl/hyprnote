import "@hypr/ui/globals.css";
import "./styles/globals.css";

import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { Provider, useStores } from "tinybase/ui-react";
import { V1 } from "./tinybase/seed";
import {
  METRICS,
  type Store as HybridStore,
  STORE_ID as STORE_ID_HYBRID,
  StoreComponent as StoreComponentHybrid,
  UI,
} from "./tinybase/store/hybrid";
import { StoreComponent as StoreComponentLocal } from "./tinybase/store/local";
import { StoreComponent as StoreComponentMemory } from "./tinybase/store/memory";

import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree, context: {} });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const stores = useStores();
  const hybridStore = stores[STORE_ID_HYBRID] as unknown as HybridStore;
  const humansCount = UI.useMetric(METRICS.totalHumans, STORE_ID_HYBRID);

  if (!hybridStore) {
    return null;
  }

  if (import.meta.env.DEV) {
    // @ts-ignore
    window.__dev = {
      seed: () => hybridStore.setTables(V1),
    };

    if (!humansCount) {
      hybridStore.setTables(V1);
    }
  }

  return <RouterProvider router={router} context={{ hybridStore }} />;
}

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <Provider>
        <App />
        <StoreComponentHybrid />
        <StoreComponentLocal />
        <StoreComponentMemory />
      </Provider>
    </StrictMode>,
  );
}
