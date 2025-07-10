import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";

import { DefaultCatchBoundary } from "./components/DefaultCatchBoundary";
import { routeTree } from "./routeTree.gen";

export function createRouter() {
  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {},
  });

  const router = createTanStackRouter({
    routeTree,
    defaultPreload: "intent",
    context: { queryClient },
    defaultErrorComponent: DefaultCatchBoundary,
  });

  return routerWithQueryClient(
    router,
    queryClient,
  );
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
