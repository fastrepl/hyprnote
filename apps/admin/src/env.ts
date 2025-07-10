import { z } from "zod";

type EnvSchemaType = z.infer<typeof envSchema>;

declare global {
  namespace NodeJS {
    interface ProcessEnv extends EnvSchemaType {}
  }
}

const envSchema = z.object({});

const envServer = envSchema.safeParse({});

if (!envServer.success) {
  console.error(envServer.error.issues);
  throw new Error("There is an error with the server environment variables");
  process.exit(1);
}

export const envServerSchema = envServer.data;
