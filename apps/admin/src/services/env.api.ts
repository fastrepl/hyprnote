import { createServerFn } from "@tanstack/react-start";

import { envServerKeys, envServerSchema } from "@/envServer";
import { z } from "zod";

export const getEnv = createServerFn({ method: "GET" })
  .validator(z.object({ key: z.enum(envServerKeys) }))
  .handler(
    async ({ data }) => {
      return envServerSchema[data.key];
    },
  );
