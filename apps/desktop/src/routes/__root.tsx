import {
  createRootRouteWithContext,
  type LinkProps,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { lazy, useEffect } from "react";

import type { DeepLink } from "@hypr/plugin-deeplink2";
import { events as windowsEvents } from "@hypr/plugin-windows";

import { AuthProvider } from "../auth";
import { BillingProvider } from "../billing";
import { ErrorComponent, NotFoundComponent } from "../components/control";
import type { Context } from "../types";

0 as DeepLink["to"] extends NonNullable<LinkProps["to"]>
  ? 0
  : "DeepLink['to'] must match a valid route";

export const Route = createRootRouteWithContext<Partial<Context>>()({
  component: Component,
  errorComponent: ErrorComponent,
  notFoundComponent: NotFoundComponent,
});

function Component() {
  useNavigationEvents();

  return (
    <AuthProvider>
      <BillingProvider>
        <Outlet />
      </BillingProvider>
    </AuthProvider>
  );
}

const useNavigationEvents = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const webview = getCurrentWebviewWindow();

    windowsEvents
      .navigate(webview)
      .listen(({ payload }) => {
        navigate({ to: payload.path, search: payload.search ?? undefined });
      })
      .then((fn) => {
        unlisten = fn;
      });

    return () => {
      unlisten?.();
    };
  }, [navigate]);
};

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
