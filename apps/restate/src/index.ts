import * as restate from "@restatedev/restate-sdk-cloudflare-workers/fetch";

import { type Env, envSchema } from "./env";
import { rateLimiter } from "./services/rate-limit";
import { sttFile } from "./services/stt-file";

export default {
  fetch(request: Request, _env: Env, _ctx: ExecutionContext) {
    const env = envSchema.parse(_env);
    return restate.createEndpointHandler({
      services: [rateLimiter, sttFile],
      ...(env.RESTATE_IDENTITY_KEY
        ? { identityKeys: [env.RESTATE_IDENTITY_KEY] }
        : {}),
    })(request, env);
  },
};
