import { lazy, Suspense } from "react";
import {
  Outlet,
  createRootRouteWithContext,
  CatchNotFound,
} from "@tanstack/react-router";
import type { Context } from "../main";
import { CatchNotFoundFallback, NotFoundComponent } from "@/components/control";

export const Route = createRootRouteWithContext<Context>()({
  component: Component,
  notFoundComponent: NotFoundComponent,
});

function Component() {
  return (
    <>
      <CatchNotFound fallback={(e) => <CatchNotFoundFallback error={e} />}>
        <Outlet />
      </CatchNotFound>
      <Suspense>
        <TanStackRouterDevtools position="bottom-left" />
      </Suspense>
    </>
  );
}

const TanStackRouterDevtools =
  process.env.NODE_ENV === "production"
    ? () => null
    : lazy(() =>
        import("@tanstack/router-devtools").then((res) => ({
          default: (
            props: React.ComponentProps<typeof res.TanStackRouterDevtools>,
          ) => <res.TanStackRouterDevtools {...props} />,
        })),
      );
