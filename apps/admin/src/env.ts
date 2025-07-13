import { z } from "zod";

type EnvSchemaType = z.infer<typeof envSchema>;

declare global {
  namespace NodeJS {
    interface ProcessEnv extends EnvSchemaType {}
  }
}

const envSchema = z.object({
  ADMIN_EMAIL: z.string().email().default("yujonglee@hyprnote.com"),
  ORG_SLUG: z.string().default("hyprnote"),
  TELEMETRY: z.coerce.boolean().default(true),
});

const envServer = envSchema.safeParse({
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ORG_SLUG: process.env.ORG_SLUG,
  TELEMETRY: process.env.TELEMETRY,
});

if (!envServer.success) {
  throw new Error(`There is an error with the server environment variables: ${JSON.stringify(envServer.error.issues)}`);
}

export const ENV_KEYS = Object.keys(envSchema.shape) as [keyof EnvSchemaType, ...(keyof EnvSchemaType)[]];
export const envServerSchema = envServer.data;
