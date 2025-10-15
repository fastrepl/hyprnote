import {
  createRootRouteWithContext,
  ErrorComponentProps,
  NotFoundRouteProps,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { lazy, Suspense, useEffect } from "react";

import { events as windowsEvents } from "@hypr/plugin-windows/v1";
import { AuthProvider } from "../auth";
import type { Context } from "../types";

export const Route = createRootRouteWithContext<Partial<Context>>()({
  component: Component,
  errorComponent: (props: ErrorComponentProps) => <pre>{JSON.stringify(props, null, 2)}</pre>,
  notFoundComponent: (props: NotFoundRouteProps) => <pre>{JSON.stringify(props, null, 2)}</pre>,
});

function Component() {
  useNavigationEvents();

  return (
    <AuthProvider>
      <Outlet />
      <Suspense>
        <TinybaseInspector />
        <Devtool />
      </Suspense>
    </AuthProvider>
  );
}

const useNavigationEvents = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const webview = getCurrentWebviewWindow();

    windowsEvents.navigate(webview).listen(({ payload }) => {
      navigate({ to: payload.path, search: payload.search ?? undefined });
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [navigate]);
};

export const TanStackRouterDevtools = process.env.NODE_ENV === "production"
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

const Devtool = process.env.NODE_ENV === "production"
  ? () => null
  : lazy(() =>
    import("../devtool/index").then(({ Devtool }) => ({
      default: Devtool,
    }))
  );
