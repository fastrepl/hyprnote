import { createRootRoute, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Provider } from "tinybase/ui-react";

import { StoreComponent as StoreComponentHybrid } from "../tinybase/store/hybrid";
import { StoreComponent as StoreComponentLocal } from "../tinybase/store/local";
import { StoreComponent as StoreComponentMemory } from "../tinybase/store/memory";

export const Route = createRootRoute({ component: Component });

function Component() {
  return (
    <Provider>
      <StoreComponentHybrid />
      <StoreComponentLocal />
      <StoreComponentMemory />
      <Outlet />
      <Suspense>
        <TanStackRouterDevtools position="bottom-right" initialIsOpen={false} />
        <TinybaseInspector />
      </Suspense>
    </Provider>
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
