import { createRootRoute, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const RootLayout = () => (
  <>
    <Outlet />
    <Suspense>
      <TanStackRouterDevtools position="bottom-right" initialIsOpen={false} />
      <TinybaseInspector />
    </Suspense>
  </>
);

export const Route = createRootRoute({ component: RootLayout });

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
