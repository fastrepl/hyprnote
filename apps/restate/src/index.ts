import * as restate from "@restatedev/restate-sdk-cloudflare-workers";

import { audioPipeline } from "./audioPipeline.js";
import { userRateLimiter } from "./userRateLimiter.js";

export default {
  fetch: restate.createEndpointHandler({
    services: [audioPipeline, userRateLimiter],
  }),
};
