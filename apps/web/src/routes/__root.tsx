import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { lazy } from "react";

import { fetchUser } from "@/functions/auth";

import appCss from "@/styles.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    const user = await fetchUser();
    return { user };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Hyprnote" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
    ],
  }),

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools config={{ position: "bottom-right" }} />
        <Scripts />
      </body>
    </html>
  );
}

export const TanStackDevtools = process.env.NODE_ENV === "production"
  ? () => null
  : lazy(() =>
    Promise.all([
      import("@tanstack/react-devtools"),
      import("@tanstack/react-router-devtools"),
      import("@tanstack/react-query-devtools"),
    ]).then(([devtools, router, query]) => ({
      default: (
        props: React.ComponentProps<typeof devtools.TanStackDevtools>,
      ) => (
        <devtools.TanStackDevtools
          {...props}
          plugins={[
            { name: "Tanstack Router", render: <router.TanStackRouterDevtoolsPanel /> },
            { name: "Tanstack Query", render: <query.ReactQueryDevtoolsPanel /> },
          ]}
        />
      ),
    }))
  );
