import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { AppLoading } from "../main";
import type { Context } from "../types";
import { isExtHostPath } from "../utils/ext-host";

const MainAppLayout = lazy(() => import("../components/main-app-layout"));

export const Route = createRootRouteWithContext<Partial<Context>>()({
  component: Component,
});

function Component() {
  const isExtHost =
    typeof window !== "undefined" && isExtHostPath(window.location.pathname);

  if (isExtHost) {
    return <Outlet />;
  }

  return (
    <Suspense fallback={<AppLoading />}>
      <MainAppLayout />
    </Suspense>
  );
}

export const TanStackRouterDevtools =
  process.env.NODE_ENV === "production"
    ? () => null
    : lazy(() =>
        import("@tanstack/react-router-devtools").then((res) => ({
          default: (
            props: React.ComponentProps<typeof res.TanStackRouterDevtools>,
          ) => <res.TanStackRouterDevtools {...props} />,
        })),
      );
