import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const RootLayout = () => (
  <>
    <div className="p-2 flex gap-2">
      <Link to="/app">
        Home
      </Link>
    </div>
    <hr />
    <Outlet />
    <Suspense>
      <TanStackRouterDevtools position={"bottom-left"} initialIsOpen={false} />
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
