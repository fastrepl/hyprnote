import { useQuery } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet, useNavigate } from "@tanstack/react-router";
import { app } from "@tauri-apps/api";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { lazy, Suspense, useEffect } from "react";

import { events as windowsEvents } from "@hypr/plugin-windows";
import { AuthProvider } from "../auth";
import { ErrorComponent, NotFoundComponent } from "../components/control";
import type { Context } from "../types";

export const Route = createRootRouteWithContext<Partial<Context>>()({
  component: Component,
  errorComponent: ErrorComponent,
  notFoundComponent: NotFoundComponent,
});

function Component() {
  useNavigationEvents();

  return (
    <AuthProvider>
      <Outlet />
      <Suspense>
        <DevtoolWrapper />
      </Suspense>
    </AuthProvider>
  );
}

function DevtoolWrapper() {
  const { data: appIdentifier } = useQuery({
    queryKey: ["appIdentifier"],
    queryFn: () => app.getIdentifier(),
  });

  if (["com.hyprnote.dev", "com.hyprnote.staging"].includes(appIdentifier ?? "")) {
    return <Devtool />;
  }

  return null;
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

const Devtool = lazy(() =>
  import("../devtool/index").then(({ Devtool }) => ({
    default: Devtool,
  }))
);
