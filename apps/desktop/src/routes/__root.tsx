import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

import { AuthContext } from "../auth";

type Context = {
  auth?: AuthContext;
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<Context>()({
  component: () => (
    <>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
});
