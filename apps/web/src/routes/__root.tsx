import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { lazy } from "react";

import { NotFoundDocument } from "@/components/not-found";
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
    links: [{ rel: "stylesheet", href: appCss }],
    scripts: [
      {
        src: "https://static.zdassets.com/ekr/snippet.js?key=15949e47-ed5a-4e52-846e-200dd0b8f4b9",
        defer: true,
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundDocument,
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

export const TanStackDevtools =
  process.env.NODE_ENV === "production"
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
                {
                  name: "Tanstack Router",
                  render: <router.TanStackRouterDevtoolsPanel />,
                },
                {
                  name: "Tanstack Query",
                  render: <query.ReactQueryDevtoolsPanel />,
                },
              ]}
            />
          ),
        })),
      );
