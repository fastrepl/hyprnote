import { createRootRouteWithContext, ErrorComponentProps, NotFoundRouteProps, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import type { Context } from "../types";

export const Route = createRootRouteWithContext<Partial<Context>>()({
  component: Component,
  errorComponent: (props: ErrorComponentProps) => <pre>{JSON.stringify(props, null, 2)}</pre>,
  notFoundComponent: (props: NotFoundRouteProps) => <pre>{JSON.stringify(props, null, 2)}</pre>,
});

function Component() {
  return (
    <>
      <Outlet />
      <Suspense>
        <TanStackRouterDevtools position="bottom-right" initialIsOpen={false} />
        <TinybaseInspector />
      </Suspense>
    </>
  );
}

const TanStackRouterDevtools = process.env.NODE_ENV === "production"
  ? () => null
  : lazy(() =>
    import("@tanstack/react-router-devtools").then((res) => ({
      default: (
        props: React.ComponentProps<typeof res.TanStackRouterDevtools>,
      ) => <res.TanStackRouterDevtools {...props} />,
    }))
  );

const TinybaseInspector = process.env.NODE_ENV === "production"
  ? () => null
  : lazy(() =>
    import("tinybase/ui-react-inspector").then((res) => ({
      default: (
        props: React.ComponentProps<typeof res.Inspector>,
      ) => <res.Inspector {...props} />,
    }))
  );
