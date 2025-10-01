import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { Provider as TinyBaseProvider } from "tinybase/ui-react";

import { routeTree } from "./routeTree.gen";
import { initMain } from "./tinybase";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const main = initMain();

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <TinyBaseProvider
        storesById={{ main: main.store }}
        relationshipsById={{ main: main.relationships }}
        queriesById={{ main: main.queries }}
      >
        <RouterProvider router={router} />
      </TinyBaseProvider>
    </StrictMode>,
  );
}
