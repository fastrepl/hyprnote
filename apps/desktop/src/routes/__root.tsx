// react-scan must be imported before React
import { scan } from "react-scan";

import { events as windowsEvents } from "@hypr/plugin-windows";
import { useQuery } from "@tanstack/react-query";
import { CatchNotFound, createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { lazy, Suspense, useEffect } from "react";

import { CatchNotFoundFallback, ErrorComponent, NotFoundComponent } from "@/components/control";
import type { Context } from "@/types";

export const Route = createRootRouteWithContext<Required<Context>>()({
  component: Component,
  errorComponent: ErrorComponent,
  notFoundComponent: NotFoundComponent,
});

const POSITION = "bottom-right";

function Component() {
  const navigate = useNavigate();

  const showDevtools = useQuery({
    queryKey: ["showDevtools"],
    queryFn: () => {
      const flag = (window as any).TANSTACK_DEVTOOLS;
      return (flag ?? false);
    },
    enabled: process.env.NODE_ENV !== "production",
    refetchInterval: 1000,
  });

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const webview = getCurrentWebviewWindow();
    windowsEvents.navigate(webview).listen(({ payload }) => {
      navigate({ to: payload.path });
    }).then((fn) => {
      unlisten = fn;
    });

    return () => unlisten?.();
  }, [navigate]);

  useEffect(() => {
    scan({
      enabled: true,
    });
  }, []);

  return (
    <>
      <CatchNotFound fallback={(e) => <CatchNotFoundFallback error={e} />}>
        <Outlet />
      </CatchNotFound>
      {showDevtools.data && (
        <Suspense>
          <TanStackRouterDevtools position={POSITION} initialIsOpen={false} />
          <TanStackQueryDevtools
            buttonPosition={POSITION}
            position="bottom"
            initialIsOpen={false}
          />
        </Suspense>
      )}
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

const TanStackQueryDevtools = process.env.NODE_ENV === "production"
  ? () => null
  : lazy(() =>
    import("@tanstack/react-query-devtools").then((res) => ({
      default: (
        props: React.ComponentProps<typeof res.ReactQueryDevtools>,
      ) => <res.ReactQueryDevtools {...props} />,
    }))
  );
