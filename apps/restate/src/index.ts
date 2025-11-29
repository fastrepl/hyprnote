import * as restate from "@restatedev/restate-sdk-cloudflare-workers/fetch";

import { audioPipeline } from "./audioPipeline";
import { type Env, envSchema } from "./env";
import { userRateLimiter } from "./userRateLimiter";

export default {
  fetch(request: Request, _env: Env, _ctx: ExecutionContext) {
    const env = envSchema.parse(_env);
    return restate.createEndpointHandler({
      services: [audioPipeline, userRateLimiter],
      identityKeys: [env.RESTATE_IDENTITY_KEY],
    })(request, { env });
  },
};
