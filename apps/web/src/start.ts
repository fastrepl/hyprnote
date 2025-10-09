import { createMiddleware, createStart } from "@tanstack/react-start";

import * as Sentry from "@sentry/tanstackstart-react";

const sentryGlobalMiddleware = createMiddleware()
  .server(Sentry.sentryGlobalServerMiddlewareHandler());

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [sentryGlobalMiddleware],
  };
});
