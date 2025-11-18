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

const TITLE = "Hyprnote - AI notepad for private meetings";
const DESCRIPTION =
  "Hyprnote is a private, on-device AI notepad that enhances your own notes—without bots, cloud recording, or meeting intrusion. Stay engaged, build your personal knowledge base, and export to tools like Notion on your terms.";
const KEYWORDS =
  "AI notepad, privacy-first AI, on-device AI, local AI, edge AI, meeting notes, personal knowledge base, AI notetaking, AI notetaker, Argmax, Deepgram, secure transcription, notepad app, notetaking app";

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    const user = await fetchUser();
    return { user };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "keywords", content: KEYWORDS },
      { name: "ai-sitemap", content: "https://hyprnote.com/llms.txt" },
      { name: "ai-content", content: "public" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://hyprnote.com" },
      {
        property: "og:image",
        content:
          "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/og-image.jpg",
      },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@tryhyprnote" },
      { name: "twitter:creator", content: "@tryhyprnote" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:url", content: "https://hyprnote.com" },
      {
        name: "twitter:image",
        content:
          "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/og-image.jpg",
      },
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
