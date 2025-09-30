import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const RootLayout = () => (
  <>
    <div className="p-2 flex gap-4 bg-gray-100 border-b">
      <Link 
        to="/app" 
        className="px-3 py-1 rounded hover:bg-gray-200"
        activeProps={{ className: "bg-blue-500 text-white hover:bg-blue-600" }}
      >
        Home
      </Link>
      <Link 
        to="/app/settings"
        className="px-3 py-1 rounded hover:bg-gray-200"
        activeProps={{ className: "bg-blue-500 text-white hover:bg-blue-600" }}
      >
        Settings
      </Link>
    </div>
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
