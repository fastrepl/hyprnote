import { createServerFn } from "@tanstack/react-start";

import { ENV_KEYS, envServerSchema } from "@/env";
import { z } from "zod";

export const getEnv = createServerFn({ method: "GET" })
  .validator(z.object({ key: z.enum(ENV_KEYS) }))
  .handler(
    async ({ data }) => {
      return envServerSchema[data.key];
    },
  );
