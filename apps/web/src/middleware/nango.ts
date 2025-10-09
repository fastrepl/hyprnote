import { Nango } from "@nangohq/node";
import { createMiddleware } from "@tanstack/react-start";

import { env } from "../env";

export const nangoMiddleware = createMiddleware().server(async ({ next }) => {
  const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY });
  return next({ context: { nango } });
});
