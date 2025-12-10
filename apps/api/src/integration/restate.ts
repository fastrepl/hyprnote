import * as clients from "@restatedev/restate-sdk-clients";

import { env } from "../env";

let restateClientInstance: ReturnType<typeof clients.connect> | null = null;

export function getRestateClient() {
  if (!restateClientInstance) {
    restateClientInstance = clients.connect({ url: env.RESTATE_INGRESS_URL });
  }
  return restateClientInstance;
}
