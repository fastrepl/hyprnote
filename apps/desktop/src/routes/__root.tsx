import { lazy, Suspense, useEffect } from "react";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";

import {
  Outlet,
  useNavigate,
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
  const navigate = useNavigate();

  useEffect(() => {
    onOpenUrl(([url]) => {
      const link = new URL(url);

      if (link.pathname === "/callback/connect") {
        navigate({
          to: "/callback/connect",
          search: { k: link.searchParams.get("k") || "" },
        });
      }
    });
  }, []);

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
