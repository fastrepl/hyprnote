/// <reference types="vite/client" />

import { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { authQueries } from "@/services/queries";

import appCss from "@/styles/app.css?url";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  beforeLoad: async ({ context }) => {
    const userSession = await context.queryClient.ensureQueryData(authQueries.user());
    return { userSession };
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      { rel: "manifest", href: "/site.webmanifest", color: "#fffff" },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
        <Suspense>
          <TanStackRouterDevtools position={"bottom-right"} initialIsOpen={false} />
          <TanStackQueryDevtools
            buttonPosition={"bottom-right"}
            position="bottom"
            initialIsOpen={false}
          />
        </Suspense>
      </body>
    </html>
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
