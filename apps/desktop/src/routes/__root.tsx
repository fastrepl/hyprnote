import {
  createRootRouteWithContext,
  type LinkProps,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { lazy, useEffect } from "react";

import {
  type DeepLink,
  events as deeplink2Events,
} from "@hypr/plugin-deeplink2";
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
  // ext-host route runs in iframe without Tauri access, so skip auth/billing providers
  // and navigation events (which use Tauri APIs)
  const isExtHost =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/app/ext-host");

  if (isExtHost) {
    return <Outlet />;
  }

  return <MainAppLayout />;
}

function MainAppLayout() {
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
    let unlistenNavigate: (() => void) | undefined;
    let unlistenDeepLink: (() => void) | undefined;

    const webview = getCurrentWebviewWindow();

    windowsEvents
      .navigate(webview)
      .listen(({ payload }) => {
        navigate({ to: payload.path, search: payload.search ?? undefined });
      })
      .then((fn) => {
        unlistenNavigate = fn;
      });

    deeplink2Events.deepLinkEvent
      .listen(({ payload }) => {
        navigate({ to: payload.to, search: payload.search });
      })
      .then((fn) => {
        unlistenDeepLink = fn;
      });

    return () => {
      unlistenNavigate?.();
      unlistenDeepLink?.();
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
