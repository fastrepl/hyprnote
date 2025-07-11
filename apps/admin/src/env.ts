import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

type EnvSchemaType = z.infer<typeof envSchema>;

declare global {
  namespace NodeJS {
    interface ProcessEnv extends EnvSchemaType {}
  }
}

const envSchema = z.object({
  TELEMETRY: z.boolean().default(true),
  ADMIN_EMAIL: z.string(),
});

const envServer = envSchema.safeParse({
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
});

if (!envServer.success) {
  throw new Error(`There is an error with the server environment variables: ${JSON.stringify(envServer.error.issues)}`);
}

export const envServerSchema = envServer.data;
