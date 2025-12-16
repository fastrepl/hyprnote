import {
  createRootRouteWithContext,
  type LinkProps,
  Outlet,
} from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import type { DeepLink } from "@hypr/plugin-deeplink2";

import type { Context } from "../types";
import { isExtHostPath } from "../utils/ext-host";

// Lazy load MainAppLayout to prevent auth.tsx from being imported in iframe context.
// This is necessary because auth.tsx creates Supabase client at module level which uses Tauri APIs.
const MainAppLayout = lazy(() => import("../components/main-app-layout"));

0 as DeepLink["to"] extends NonNullable<LinkProps["to"]>
  ? 0
  : "DeepLink['to'] must match a valid route";

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
    <Suspense fallback={null}>
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
