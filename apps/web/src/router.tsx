import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { PostHogProvider } from "./providers/posthog";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    Wrap: (props: { children: React.ReactNode }) => {
      return (
        <PostHogProvider>
          <QueryClientProvider client={queryClient}>
            {props.children}
          </QueryClientProvider>
        </PostHogProvider>
      );
    },
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
};
