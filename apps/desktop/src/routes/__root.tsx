import { lazy, Suspense, useEffect } from "react";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";

import {
  Outlet,
  useNavigate,
  createRootRouteWithContext,
} from "@tanstack/react-router";

import type { Context } from "../main";

export const Route = createRootRouteWithContext<Context>()({
  component: Component,
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
      <Outlet />
      <Suspense>
        <TanStackRouterDevtools />
      </Suspense>
    </>
  );
}

const TanStackRouterDevtools =
  process.env.NODE_ENV === "production"
    ? () => null
    : lazy(() =>
        import("@tanstack/router-devtools").then((res) => ({
          default: res.TanStackRouterDevtools,
        })),
      );
