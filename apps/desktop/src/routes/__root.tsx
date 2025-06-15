// react-scan must be imported before React
import { scan } from "react-scan";

import { useQuery } from "@tanstack/react-query";
import { CatchNotFound, createRootRouteWithContext, Outlet, useNavigate } from "@tanstack/react-router";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { lazy, Suspense, useEffect } from "react";

import { CatchNotFoundFallback, ErrorComponent, NotFoundComponent } from "@/components/control";
import { HyprProvider } from "@/contexts";
import type { Context } from "@/types";
import { events as windowsEvents, init as windowsInit } from "@hypr/plugin-windows";

export const Route = createRootRouteWithContext<Required<Context>>()({
  component: Component,
  errorComponent: ErrorComponent,
  notFoundComponent: NotFoundComponent,
});

const POSITION = "bottom-right";

declare global {
  interface Window {
    __HYPR_NAVIGATE__?: (to: string) => void;
  }
}

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
    window.__HYPR_NAVIGATE__ = (to: string) => {
      navigate({ to });
    };

    return () => {
      window.__HYPR_NAVIGATE__ = undefined;
    };
  }, [navigate]);

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
    windowsInit();
    scan({ enabled: true });
  }, []);

  // Listen for debug events from control window
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<string>("debug", (event) => {
      console.log(`[Control Debug] ${event.payload}`);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => unlisten?.();
  }, []);

  return (
    <HyprProvider>
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
    </HyprProvider>
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
