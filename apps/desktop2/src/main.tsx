import "@hypr/ui/globals.css";
import "./styles/globals.css";

import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { Provider, useStores } from "tinybase/ui-react";
import {
  type Store as HybridStore,
  STORE_ID as STORE_ID_HYBRID,
  StoreComponent as StoreComponentHybrid,
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

  if (!hybridStore) {
    return null;
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
